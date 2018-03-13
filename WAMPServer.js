const schemas = require('./schemas');

class WAMPServer {
	constructor() {
		this.endpoints = {
			rpc: {},
			event: {},
		};
	}

	/**
	 * @param {Object} request
	 * @param {Error} error
	 * @param {*} data
	 * @returns {Object}
	 */
	static createResponsePayload(request, error, data) {
		return Object.assign({}, request, {
			success: !error,
			data,
			error,
			type: schemas.reqToResMap[request.type],
		});
	}

	/**
	 * @param {Object} socket - SocketCluster.Socket
	 * @returns {Object} wampSocket
	 */
	upgradeToWAMP(socket) {
		// register RPC endpoints
		socket.on('rpc-request', (request, responder) => {
			if (schemas.isValid(request, schemas.RPCRequestSchema)) {
				this.processWAMPRequest(request, responder);
			}
		});
		// register Event endpoints
		Object.keys(this.endpoints.event).forEach((event) => {
			if (typeof this.endpoints.event[event] === 'function') {
				socket.on(event, this.endpoints.event[event]);
			}
		});

		return socket;
	}

	/**
	 * @param {RPCRequestSchema} request
	 * @param {SocketCluster.Response} responder
	 * @returns {undefined}
	 */
	processWAMPRequest(request, responder) {
		const isValidWAMPEndpoint = (endpointType, procedure) =>
			this.endpoints[endpointType][procedure] &&
			typeof this.endpoints[endpointType][procedure] === 'function';

		if (isValidWAMPEndpoint('rpc', request.procedure)) {
			return this.endpoints.rpc[request.procedure](request.data, responder);
		} else if (isValidWAMPEndpoint('event', request.procedure)) {
			return this.endpoints.event[request.procedure](request.data);
		}
		return responder(
			`Procedure ${request.procedure} not registered on WAMPServer.
			Available commands: ${this.endpoints}`
		);
	}

	/**
	 * @class RPCEndpoint
	 * @property {function} procedure
	 */

	/**
	 * @param {Map<RPCEndpoint>} endpoints
	 * @returns {undefined}
	 */
	registerRPCEndpoints(endpoints) {
		this.endpoints.rpc = Object.assign(this.endpoints.rpc, endpoints);
	}

	/**
	 * @param {Map<RPCEndpoint>} endpoints
	 * @returns {undefined}
	 */
	registerEventEndpoints(endpoints) {
		this.endpoints.event = Object.assign(this.endpoints.event, endpoints);
	}

	/**
	 * @param {Map<RPCEndpoint>} endpoints
	 * @returns {undefined}
	 */
	reassignRPCEndpoints(endpoints) {
		this.endpoints.rpc = endpoints;
	}

	/**
	 * @param {Map<RPCEndpoint>} endpoints
	 * @returns {undefined}
	 */
	reassignEventEndpoints(endpoints) {
		this.endpoints.event = endpoints;
	}
}

module.exports = WAMPServer;
