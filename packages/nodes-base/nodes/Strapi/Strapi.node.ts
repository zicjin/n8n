import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	getToken,
	strapiApiRequest,
	strapiApiRequestAllItems,
	validateJSON,
} from './GenericFunctions';

import {
	entryFields,
	entryOperations,
} from './EntryDescription';

export class Strapi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Strapi',
		name: 'strapi',
		icon: 'file:strapi.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Strapi API',
		defaults: {
			name: 'Strapi',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'strapiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				noDataExpression: true,
				type: 'options',
				options: [
					{
						name: 'Entry',
						value: 'entry',
					},
				],
				default: 'entry',
				description: 'The resource to operate on',
			},
			...entryOperations,
			...entryFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		const headers: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const { apiVersion } = await this.getCredentials('strapiApi') as IDataObject;
		const { jwt } = await getToken.call(this);

		headers.Authorization = `Bearer ${jwt}`;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'entry') {
					if (operation === 'create') {

						const body: IDataObject = {};

						const contentType = this.getNodeParameter('contentType', i) as string;

						const columns = this.getNodeParameter('columns', i) as string;

						const columnList = columns.split(',').map(column => column.trim());

						for (const key of Object.keys(items[i].json)) {
							if (columnList.includes(key)) {
								apiVersion === 'v4'? body.data = items[i].json: body[key] = items[i].json[key];
							}
						}
						apiVersion === 'v4'? responseData = await strapiApiRequest.call(this, 'POST', `/api/${contentType}`, body, qs, undefined, headers): responseData = await strapiApiRequest.call(this, 'POST', `/${contentType}`, body, qs, undefined, headers);

						returnData.push(responseData);
					}

					if (operation === 'delete') {
						const contentType = this.getNodeParameter('contentType', i) as string;

						const entryId = this.getNodeParameter('entryId', i) as string;

						apiVersion === 'v4'? ({data:responseData} = await strapiApiRequest.call(this, 'DELETE', `/api/${contentType}/${entryId}`, {}, qs, undefined, headers)):responseData = await strapiApiRequest.call(this, 'DELETE', `/${contentType}/${entryId}`, {}, qs, undefined, headers);

						returnData.push(responseData);
					}

					if (operation === 'getAll') {

						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const contentType = this.getNodeParameter('contentType', i) as string;

						const options = this.getNodeParameter('options', i) as IDataObject;

						if(apiVersion === 'v4') {
							// Sort Option
							if(options.sort && (options.sort as string[]).length !== 0) {
								const sortFields = options.sort as string[];
								qs.sort = sortFields.join(',');
							}
							// Filter Option
							if (options.where) {
								const query = validateJSON(options.where as string);
								if (query !== undefined) {
									qs.filters = query;
								} else {
									throw new NodeOperationError(this.getNode(), 'Query must be a valid JSON');
								}
							}
							// Publication Option
							if (options.publicationState) {
								qs.publicationState = options.publicationState as string;
							}
							// Limit Option
							if (returnAll) {
								responseData = await strapiApiRequestAllItems.call(this, 'GET', `/api/${contentType}`, {}, qs, headers);
							} else {
								qs["pagination[pageSize]"] = this.getNodeParameter('limit', i) as number;
								({ data:responseData } = await strapiApiRequest.call(this, 'GET', `/api/${contentType}`, {}, qs, undefined, headers));
							}
						} else {
							// Sort Option
							if (options.sort && (options.sort as string[]).length !== 0) {
								const sortFields = options.sort as string[];
								qs._sort = sortFields.join(',');
							}
							// Filter Option
							if (options.where) {
								const query = validateJSON(options.where as string);
								if (query !== undefined) {
									qs._where = query;
								} else {
									throw new NodeOperationError(this.getNode(), 'Query must be a valid JSON');
								}
							}
							// Publication Option
							if (options.publicationState) {
								qs._publicationState = options.publicationState as string;
							}
							// Limit Option
							if (returnAll) {
								responseData = await strapiApiRequestAllItems.call(this, 'GET', `/${contentType}`, {}, qs, headers);
							} else {
								qs._limit = this.getNodeParameter('limit', i) as number;
								responseData = await strapiApiRequest.call(this, 'GET', `/${contentType}`, {}, qs, undefined, headers);
							}
						}
						returnData.push.apply(returnData, responseData);
					}

					if (operation === 'get') {

						const contentType = this.getNodeParameter('contentType', i) as string;

						const entryId = this.getNodeParameter('entryId', i) as string;

						apiVersion === 'v4'? ({data:responseData}=await strapiApiRequest.call(this, 'GET', `/api/${contentType}/${entryId}`, {}, qs, undefined, headers)):responseData = await strapiApiRequest.call(this, 'GET', `/${contentType}/${entryId}`, {}, qs, undefined, headers);

						returnData.push(responseData);
					}

					if (operation === 'update') {

						const body: IDataObject = {};

						const contentType = this.getNodeParameter('contentType', i) as string;

						const columns = this.getNodeParameter('columns', i) as string;

						const updateKey = this.getNodeParameter('updateKey', i) as string;

						const columnList = columns.split(',').map(column => column.trim());

						const entryId = items[i].json[updateKey];

						for (const key of Object.keys(items[i].json)) {
							if (columnList.includes(key)) {
								apiVersion === 'v4'? body.data = items[i].json:body[key] = items[i].json[key];
							}
						}
						apiVersion === 'v4'? ({data:responseData} = await strapiApiRequest.call(this, 'PUT', `/api/${contentType}/${entryId}`, body, qs, undefined, headers)): responseData = await strapiApiRequest.call(this, 'PUT', `/${contentType}/${entryId}`, body, qs, undefined, headers);

						returnData.push(responseData);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
