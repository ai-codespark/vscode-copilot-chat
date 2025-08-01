/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ConfigKey, IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { IChatModelInformation } from '../../../platform/endpoint/common/endpointProvider';
import { ILogService } from '../../../platform/log/common/logService';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { BYOKAuthType, BYOKKnownModels, BYOKModelCapabilities, resolveModelInfo } from '../common/byokProvider';
import { BaseOpenAICompatibleLMProvider } from './baseOpenAICompatibleProvider';
import { IBYOKStorageService } from './byokStorageService';

export class LiteLLMLMProvider extends BaseOpenAICompatibleLMProvider {
	public static readonly providerName = 'LiteLLM';

	constructor(
		knownModels: BYOKKnownModels,
		private readonly byokStorageService: IBYOKStorageService,
		@IFetcherService _fetcherService: IFetcherService,
		@ILogService _logService: ILogService,
		@IInstantiationService _instantiationService: IInstantiationService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
	) {
		// Read from VS Code settings first, then environment variables, fallback to placeholder
		const baseUrl = _configurationService.getConfig(ConfigKey.LiteLLMEndpoint) ||
			(globalThis as any).process?.env?.LITELLM_BASE_URL ||
			'https://your-litellm-endpoint/v1';

		_logService.info(`LiteLLM: Initializing with base URL: ${baseUrl}`);
		_logService.info(`LiteLLM: Known models count: ${Object.keys(knownModels || {}).length}`);

		super(
			BYOKAuthType.GlobalApiKey,
			LiteLLMLMProvider.providerName,
			baseUrl,
			knownModels,
			byokStorageService,
			_fetcherService,
			_logService,
			_instantiationService
		);
	}

	override async prepareLanguageModelChat(options: { silent: boolean }, token: any): Promise<any[]> {
		// Check for API key in VS Code settings first, then environment variable
		const configApiKey = this._configurationService.getConfig(ConfigKey.LiteLLMApiKey);
		const envApiKey = (globalThis as any).process?.env?.LITELLM_API_KEY;
		const apiKey = configApiKey || envApiKey;

		(this as any)._logService.info(`LiteLLM: prepareLanguageModelChat called, silent: ${options.silent}`);
		(this as any)._logService.info(`LiteLLM: API key source: ${configApiKey ? 'config' : envApiKey ? 'env' : 'none'}`);

		if (apiKey) {
			// Store the API key in the storage service
			await this.byokStorageService.storeAPIKey(LiteLLMLMProvider.providerName, apiKey, BYOKAuthType.GlobalApiKey);
		}

		// Call the parent implementation
		const result = await super.prepareLanguageModelChat(options, token);
		(this as any)._logService.info(`LiteLLM: prepareLanguageModelChat returned ${result.length} models`);
		return result;
	}

	override async getModelInfo(modelId: string, apiKey: string | undefined, modelCapabilities?: BYOKModelCapabilities): Promise<IChatModelInformation> {
		// Use a protected getter for knownModels (add to base if needed)
		const info = await resolveModelInfo(modelId, LiteLLMLMProvider.providerName, (this as any)._knownModels, modelCapabilities);
		// Set this model as default
		return { ...info, is_chat_default: true };
	}
}
