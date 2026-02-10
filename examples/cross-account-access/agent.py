"""
Simple AgentCore Runtime agent demonstrating cross-account access.

This agent echoes back messages with information about the caller,
useful for verifying cross-account invocations are working.
"""

import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer


class AgentHandler(BaseHTTPRequestHandler):
    """HTTP handler for AgentCore Runtime protocol."""

    def do_POST(self):
        """Handle POST requests from AgentCore."""
        # Read request body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        try:
            request = json.loads(body)
            message = request.get('message', 'No message provided')
            user_id = request.get('user_id', 'unknown')
            session_id = request.get('session_id', 'unknown')

            # Echo response with caller information
            response = {
                'response': f'Hello! You said: "{message}"',
                'metadata': {
                    'user_id': user_id,
                    'session_id': session_id,
                    'message': 'Cross-account invocation successful!',
                }
            }

            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            # Error response
            error_response = {'error': str(e)}
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(error_response).encode())

    def log_message(self, format, *args):
        """Override to use print instead of stderr."""
        print(f"[Agent] {format % args}")


def main():
    """Start the agent HTTP server."""
    port = 8080
    server = HTTPServer(('0.0.0.0', port), AgentHandler)
    print(f"[Agent] Starting cross-account agent on port {port}...")
    print("[Agent] This agent demonstrates resource-based policy for cross-account access")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Agent] Shutting down...")
        server.shutdown()
        sys.exit(0)


if __name__ == '__main__':
    main()
