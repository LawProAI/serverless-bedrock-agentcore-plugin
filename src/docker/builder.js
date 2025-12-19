'use strict';

const { execSync } = require('child_process');
const path = require('path');

/**
 * Execute a shell command synchronously
 */
function execCommand(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    });
  } catch (error) {
    if (options.ignoreError) {
      return null;
    }
    throw error;
  }
}

/**
 * Docker image builder for AgentCore runtimes
 * Follows similar patterns to Serverless Framework's ECR image handling
 */
class DockerBuilder {
  constructor(serverless, log, progress) {
    this.serverless = serverless;
    this.log = log;
    this.progress = progress;
    this.provider = serverless.getProvider('aws');
  }

  /**
   * Check if Docker is available
   */
  checkDocker() {
    try {
      execCommand('docker --version', { silent: true });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get AWS account ID
   */
  async getAccountId() {
    return this.provider.getAccountId();
  }

  /**
   * Get the region
   */
  getRegion() {
    return this.provider.getRegion();
  }

  /**
   * Authenticate with ECR
   */
  async ecrLogin(accountId, region) {
    this.log.info('Authenticating with ECR...');

    const ecrUri = `${accountId}.dkr.ecr.${region}.amazonaws.com`;

    try {
      // Get ECR login password and pipe to docker login
      const password = execCommand(`aws ecr get-login-password --region ${region}`, {
        silent: true,
      }).trim();

      execCommand(`docker login --username AWS --password-stdin ${ecrUri}`, {
        input: password,
        silent: true,
      });

      this.log.info('ECR authentication successful');

      return ecrUri;
    } catch (error) {
      throw new Error(`ECR login failed: ${error.message}`);
    }
  }

  /**
   * Ensure ECR repository exists, create if not
   */
  async ensureRepository(repositoryName, region) {
    this.log.info(`Checking ECR repository: ${repositoryName}`);

    try {
      execCommand(
        `aws ecr describe-repositories --repository-names ${repositoryName} --region ${region}`,
        { silent: true }
      );
      this.log.info('Repository exists');
    } catch {
      this.log.info('Creating ECR repository...');
      execCommand(
        `aws ecr create-repository --repository-name ${repositoryName} --region ${region}`,
        { silent: true }
      );
      this.log.info('Repository created');
    }
  }

  /**
   * Build Docker image
   */
  async buildImage(imageTag, dockerConfig, servicePath) {
    const dockerfile = dockerConfig.file || 'Dockerfile';
    const context = dockerConfig.path || '.';
    // Bedrock AgentCore requires arm64 architecture
    const platform = dockerConfig.platform || 'linux/arm64';

    const dockerfilePath = path.resolve(servicePath, context, dockerfile);
    const contextPath = path.resolve(servicePath, context);

    this.log.info(`Building Docker image: ${imageTag}`);
    this.log.info(`  Dockerfile: ${dockerfilePath}`);
    this.log.info(`  Context: ${contextPath}`);
    this.log.info(`  Platform: ${platform}`);

    // Build the docker command
    let buildCmd = `docker build --platform ${platform} -t ${imageTag}`;

    // Add build args if specified
    if (dockerConfig.buildArgs) {
      for (const [key, value] of Object.entries(dockerConfig.buildArgs)) {
        buildCmd += ` --build-arg ${key}="${value}"`;
      }
    }

    // Add cache from if specified
    if (dockerConfig.cacheFrom) {
      for (const cache of dockerConfig.cacheFrom) {
        buildCmd += ` --cache-from ${cache}`;
      }
    }

    // Add any additional build options
    if (dockerConfig.buildOptions) {
      buildCmd += ` ${dockerConfig.buildOptions.join(' ')}`;
    }

    buildCmd += ` -f ${dockerfilePath} ${contextPath}`;

    try {
      execCommand(buildCmd);
      this.log.info('Docker build complete');
    } catch (error) {
      throw new Error(`Docker build failed: ${error.message}`);
    }
  }

  /**
   * Tag and push image to ECR
   */
  async pushImage(localTag, ecrUri, repositoryName, tag) {
    const ecrImage = `${ecrUri}/${repositoryName}:${tag}`;

    this.log.info(`Tagging image: ${ecrImage}`);
    execCommand(`docker tag ${localTag} ${ecrImage}`);

    this.log.info(`Pushing image to ECR...`);
    execCommand(`docker push ${ecrImage}`);

    this.log.info('Push complete');

    return ecrImage;
  }

  /**
   * Build and push image for a runtime agent
   * Returns the ECR image URI to use in CloudFormation
   */
  async buildAndPushForRuntime(agentName, imageConfig, context) {
    const { serviceName, stage, region } = context;
    const accountId = await this.getAccountId();
    const servicePath = this.serverless.serviceDir;

    // Determine repository name
    const repositoryName = imageConfig.repository || `${serviceName}-${agentName}`;

    // Determine tag (use stage or specified tag)
    const tag = imageConfig.tag || stage;

    // Local image tag
    const localTag = `${repositoryName}:${tag}`;

    // Ensure repository exists
    await this.ensureRepository(repositoryName, region);

    // Login to ECR
    const ecrUri = await this.ecrLogin(accountId, region);

    // Build image
    await this.buildImage(localTag, imageConfig, servicePath);

    // Push to ECR
    const ecrImage = await this.pushImage(localTag, ecrUri, repositoryName, tag);

    return ecrImage;
  }

  /**
   * Process all images defined in provider.ecr.images
   * Returns a map of image names to ECR URIs
   */
  async processImages(imagesConfig, context) {
    const imageUris = {};

    for (const [imageName, imageConfig] of Object.entries(imagesConfig)) {
      // If URI is already specified, use it directly
      if (imageConfig.uri) {
        imageUris[imageName] = imageConfig.uri;
        continue;
      }

      // Otherwise, build and push
      if (imageConfig.path) {
        const uri = await this.buildAndPushForRuntime(imageName, imageConfig, context);
        imageUris[imageName] = uri;
      }
    }

    return imageUris;
  }
}

module.exports = { DockerBuilder };
