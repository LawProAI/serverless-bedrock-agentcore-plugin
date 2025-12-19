# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2025-12-19

### Added

- Initial release of serverless-bedrock-agentcore plugin
- Support for AWS::BedrockAgentCore::Runtime resource
  - Container image and S3 artifact support
  - Network configuration (PUBLIC and VPC modes)
  - Protocol configuration (HTTP, MCP, A2A)
  - Environment variables
  - Authorizer configuration (AWS_IAM, CUSTOM_JWT)
  - Lifecycle configuration
- Support for AWS::BedrockAgentCore::RuntimeEndpoint resource
  - Multiple endpoints per runtime
  - Version targeting
- Support for AWS::BedrockAgentCore::Memory resource
  - Event expiry duration configuration
  - Memory strategies (semantic, userPreference, summary, custom)
  - Encryption key support
- Support for AWS::BedrockAgentCore::Gateway resource
  - AWS_IAM and CUSTOM_JWT authorization
  - MCP protocol support
  - KMS encryption support
- Support for AWS::BedrockAgentCore::GatewayTarget resource
  - Lambda function targets
  - OpenAPI specification targets
  - Smithy model targets
  - OAuth and API Key credential providers
- Automatic IAM role generation with least-privilege permissions
- Schema validation for serverless.yml configuration
- Custom command: `sls agentcore info`
- CloudFormation outputs for all resources
- Automatic tagging with service, stage, and resource metadata
- Example projects:
  - basic-runtime: Simple runtime deployment
  - with-memory: Runtime with conversation memory
  - full-stack: Complete setup with runtime, memory, gateway, and Lambda functions

### Security

- IAM roles follow least-privilege principle
- Support for KMS encryption for Memory and Gateway resources
- Support for VPC deployment for Runtime resources
