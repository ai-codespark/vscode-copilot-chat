/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
	) {
		// Read from environment variables, fallback to placeholder if not set
		const baseUrl = (globalThis as any).process?.env?.LITELLM_BASE_URL || 'https://your-litellm-endpoint/v1';
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
		// First check if we have API key from environment variable
		const envApiKey = (globalThis as any).process?.env?.LITELLM_API_KEY;
		if (envApiKey) {
			// Store the environment API key in the storage service
			await this.byokStorageService.storeAPIKey(LiteLLMLMProvider.providerName, envApiKey, BYOKAuthType.GlobalApiKey);
		}

		// Call the parent implementation
		return super.prepareLanguageModelChat(options, token);
	}

	override async getModelInfo(modelId: string, apiKey: string | undefined, modelCapabilities?: BYOKModelCapabilities): Promise<IChatModelInformation> {
		// Use a protected getter for knownModels (add to base if needed)
		const info = await resolveModelInfo(modelId, LiteLLMLMProvider.providerName, (this as any)._knownModels, modelCapabilities);
		// Set this model as default
		return { ...info, is_chat_default: true };
	}
}
