/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as azdata from 'azdata';
import * as azurecore from 'azurecore';
import { azureResource } from 'azureResource';
import * as loc from '../constants/strings';

async function getAzureCoreAPI(): Promise<azurecore.IExtension> {
	const api = (await vscode.extensions.getExtension(azurecore.extension.name)?.activate()) as azurecore.IExtension;
	if (!api) {
		throw new Error('azure core API undefined for sql-migration');
	}
	return api;
}

export type Subscription = azureResource.AzureResourceSubscription;
export async function getSubscriptions(account: azdata.Account): Promise<Subscription[]> {
	const api = await getAzureCoreAPI();
	const subscriptions = await api.getSubscriptions(account, false);
	let listOfSubscriptions = subscriptions.subscriptions;
	sortResourceArrayByName(listOfSubscriptions);
	return subscriptions.subscriptions;
}

export type AzureProduct = azureResource.AzureGraphResource;

export async function getResourceGroups(account: azdata.Account, subscription: Subscription): Promise<azureResource.AzureResourceResourceGroup[]> {
	const api = await getAzureCoreAPI();
	const result = await api.getResourceGroups(account, subscription, false);
	sortResourceArrayByName(result.resourceGroups);
	return result.resourceGroups;
}

export type SqlManagedInstance = AzureProduct;
export async function getAvailableManagedInstanceProducts(account: azdata.Account, subscription: Subscription): Promise<SqlManagedInstance[]> {
	const api = await getAzureCoreAPI();

	const result = await api.getSqlManagedInstances(account, [subscription], false);
	return result.resources;
}

export type SqlServer = AzureProduct;
export async function getAvailableSqlServers(account: azdata.Account, subscription: Subscription): Promise<SqlServer[]> {
	const api = await getAzureCoreAPI();

	const result = await api.getSqlServers(account, [subscription], false);
	return result.resources;
}

export type SqlVMServer = AzureProduct;
export async function getAvailableSqlVMs(account: azdata.Account, subscription: Subscription): Promise<SqlVMServer[]> {
	const api = await getAzureCoreAPI();

	const result = await api.getSqlVMServers(account, [subscription], false);
	return result.resources;
}

export type StorageAccount = AzureProduct;
export async function getAvailableStorageAccounts(account: azdata.Account, subscription: Subscription): Promise<StorageAccount[]> {
	const api = await getAzureCoreAPI();
	const result = await api.getStorageAccounts(account, [subscription], false);
	sortResourceArrayByName(result.resources);
	return result.resources;
}

export async function getFileShares(account: azdata.Account, subscription: Subscription, storageAccount: StorageAccount): Promise<azureResource.FileShare[]> {
	const api = await getAzureCoreAPI();
	let result = await api.getFileShares(account, subscription, storageAccount, true);
	let fileShares = result.fileShares;
	sortResourceArrayByName(fileShares);
	return fileShares!;
}

export async function getBlobContainers(account: azdata.Account, subscription: Subscription, storageAccount: StorageAccount): Promise<azureResource.BlobContainer[]> {
	const api = await getAzureCoreAPI();
	let result = await api.getBlobContainers(account, subscription, storageAccount, true);
	let blobContainers = result.blobContainers;
	sortResourceArrayByName(blobContainers);
	return blobContainers!;
}

export async function getMigrationController(account: azdata.Account, subscription: Subscription, resourceGroupName: string, regionName: string, controllerName: string): Promise<SqlMigrationController> {
	const api = await getAzureCoreAPI();
	const host = `https://${regionName}.management.azure.com`;
	const path = `/subscriptions/${subscription.id}/resourceGroups/${resourceGroupName}/providers/Microsoft.DataMigration/Controllers/${controllerName}?api-version=2020-09-01-preview`;
	const response = await api.makeAzureRestRequest(account, subscription, path, azurecore.HttpRequestMethod.GET, undefined, true, host);
	if (response.errors.length > 0) {
		throw new Error(response.errors.toString());
	}
	return response.response.data;
}

export async function getMigrationControllers(account: azdata.Account, subscription: Subscription, resourceGroupName: string, regionName: string): Promise<SqlMigrationController[]> {
	const api = await getAzureCoreAPI();
	const host = `https://${regionName}.management.azure.com`;
	const path = `/subscriptions/${subscription.id}/providers/Microsoft.DataMigration/Controllers?api-version=2020-09-01-preview`;
	const response = await api.makeAzureRestRequest(account, subscription, path, azurecore.HttpRequestMethod.GET, undefined, true, host);
	if (response.errors.length > 0) {
		throw new Error(response.errors.toString());
	}
	sortResourceArrayByName(response.response.data.value);
	return response.response.data.value;
}

export async function createMigrationController(account: azdata.Account, subscription: Subscription, resourceGroupName: string, regionName: string, controllerName: string): Promise<SqlMigrationController> {
	const api = await getAzureCoreAPI();
	const host = `https://${regionName}.management.azure.com`;
	const path = `/subscriptions/${subscription.id}/resourceGroups/${resourceGroupName}/providers/Microsoft.DataMigration/Controllers/${controllerName}?api-version=2020-09-01-preview`;
	const requestBody = {
		'location': regionName
	};
	const response = await api.makeAzureRestRequest(account, subscription, path, azurecore.HttpRequestMethod.PUT, requestBody, true, host);
	if (response.errors.length > 0) {
		throw new Error(response.errors.toString());
	}
	return response.response.data;
}

export async function getMigrationControllerAuthKeys(account: azdata.Account, subscription: Subscription, resourceGroupName: string, regionName: string, controllerName: string): Promise<GetMigrationControllerAuthKeysResult> {
	const api = await getAzureCoreAPI();
	const host = `https://${regionName}.management.azure.com`;
	const path = `/subscriptions/${subscription.id}/resourceGroups/${resourceGroupName}/providers/Microsoft.DataMigration/Controllers/${controllerName}/ListAuthKeys?api-version=2020-09-01-preview`;
	const response = await api.makeAzureRestRequest(account, subscription, path, azurecore.HttpRequestMethod.POST, undefined, true, host);
	if (response.errors.length > 0) {
		throw new Error(response.errors.toString());
	}
	return {
		authKey1: response?.response?.data?.authKey1 ?? '',
		authKey2: response?.response?.data?.authKey2 ?? ''
	};
}

export async function getStorageAccountAccessKeys(account: azdata.Account, subscription: Subscription, storageAccount: StorageAccount): Promise<GetStorageAccountAccessKeysResult> {
	const api = await getAzureCoreAPI();
	const path = `/subscriptions/${subscription.id}/resourceGroups/${storageAccount.resourceGroup}/providers/Microsoft.Storage/storageAccounts/${storageAccount.name}/listKeys?api-version=2019-06-01`;
	const response = await api.makeAzureRestRequest(account, subscription, path, azurecore.HttpRequestMethod.POST, undefined, true);
	if (response.errors.length > 0) {
		throw new Error(response.errors.toString());
	}
	return {
		keyName1: response?.response?.data?.keys[0].value ?? '',
		keyName2: response?.response?.data?.keys[0].value ?? '',
	};
}

export async function getMigrationControllerMonitoringData(account: azdata.Account, subscription: Subscription, resourceGroupName: string, regionName: string, controllerName: string): Promise<GetMigrationControllerMonitoringData> {
	const api = await getAzureCoreAPI();
	const host = `https://${regionName}.management.azure.com`;
	const path = `/subscriptions/${subscription.id}/resourceGroups/${resourceGroupName}/providers/Microsoft.DataMigration/Controllers/${controllerName}/monitoringData?api-version=2020-09-01-preview`;
	const response = await api.makeAzureRestRequest(account, subscription, path, azurecore.HttpRequestMethod.GET, undefined, true, host);
	if (response.errors.length > 0) {
		throw new Error(response.errors.toString());
	}
	console.log(response);
	return response.response.data;
}

export async function startDatabaseMigration(account: azdata.Account, subscription: Subscription, resourceGroupName: string, regionName: string, managedInstance: string, targetDatabaseName: string, requestBody: StartDatabaseMigrationRequest): Promise<StartDatabaseMigrationResponse> {
	const api = await getAzureCoreAPI();
	const host = `https://${regionName}.management.azure.com`;
	const path = `/subscriptions/${subscription.id}/resourceGroups/${resourceGroupName}/providers/Microsoft.Sql/managedInstances/${managedInstance}/providers/Microsoft.DataMigration/databaseMigrations/${targetDatabaseName}?api-version=2020-09-01-preview`;
	const response = await api.makeAzureRestRequest(account, subscription, path, azurecore.HttpRequestMethod.PUT, requestBody, true, host);
	if (response.errors.length > 0) {
		throw new Error(response.errors.toString());
	}
	return {
		status: response.response.status,
		databaseMigration: response.response.data
	};
}

export async function getDatabaseMigration(account: azdata.Account, subscription: Subscription, regionName: string, migrationId: string): Promise<DatabaseMigration> {
	const api = await getAzureCoreAPI();
	const host = `https://${regionName}.management.azure.com`;
	const path = `${migrationId}?api-version=2020-09-01-preview`;
	const response = await api.makeAzureRestRequest(account, subscription, path, azurecore.HttpRequestMethod.GET, undefined, true, host);
	if (response.errors.length > 0) {
		throw new Error(response.errors.toString());
	}
	return response.response.data;
}

export async function getMigrationStatus(account: azdata.Account, subscription: Subscription, migration: DatabaseMigration): Promise<DatabaseMigration> {
	const api = await getAzureCoreAPI();
	const host = `https://eastus2euap.management.azure.com`;
	const path = `${migration.id}?$expand=MigrationStatusDetails&api-version=2020-09-01-preview`;
	const response = await api.makeAzureRestRequest(account, subscription, path, azurecore.HttpRequestMethod.GET, undefined, true, host);
	if (response.errors.length > 0) {
		throw new Error(response.errors.toString());
	}
	return response.response.data;
}

export async function listMigrationsByController(account: azdata.Account, subscription: Subscription, controller: SqlMigrationController): Promise<DatabaseMigration[]> {
	const api = await getAzureCoreAPI();
	const host = `https://eastus2euap.management.azure.com`;
	const path = `${controller.id}/listMigrations?$expand=MigrationStatusDetails&api-version=2020-09-01-preview`;
	const response = await api.makeAzureRestRequest(account, subscription, path, azurecore.HttpRequestMethod.GET, undefined, true, host);
	if (response.errors.length > 0) {
		throw new Error(response.errors.toString());
	}
	return response.response.data.value;
}

export async function startMigrationCutover(account: azdata.Account, subscription: Subscription, migrationStatus: DatabaseMigration): Promise<any> {
	const api = await getAzureCoreAPI();
	const host = `https://eastus2euap.management.azure.com`;
	const path = `${migrationStatus.id}/operations/${migrationStatus.properties.migrationOperationId}/cutover?api-version=2020-09-01-preview`;
	const response = await api.makeAzureRestRequest(account, subscription, path, azurecore.HttpRequestMethod.POST, undefined, true, host);
	if (response.errors.length > 0) {
		throw new Error(response.errors.toString());
	}
	return response.response.data.value;
}

/**
 * For now only east us euap is supported. Actual API calls will be added in the public release.
 */
export function getMigrationControllerRegions(): azdata.CategoryValue[] {
	return [
		{
			displayName: loc.EASTUS2EUAP,
			name: 'eastus2euap'
		}
	];
}

type SortableAzureResources = AzureProduct | azureResource.FileShare | azureResource.BlobContainer | azureResource.AzureResourceSubscription | SqlMigrationController;
function sortResourceArrayByName(resourceArray: SortableAzureResources[]): void {
	if (!resourceArray) {
		return;
	}
	resourceArray.sort((a: SortableAzureResources, b: SortableAzureResources) => {
		if (a.name.toLowerCase() < b.name.toLowerCase()) {
			return -1;
		}
		if (a.name.toLowerCase() > b.name.toLowerCase()) {
			return 1;
		}
		return 0;
	});
}

export interface MigrationControllerProperties {
	name: string;
	subscriptionId: string;
	resourceGroup: string;
	location: string;
	provisioningState: string;
	integrationRuntimeState?: string;
	isProvisioned?: boolean;
}

export interface SqlMigrationController {
	properties: MigrationControllerProperties;
	location: string;
	id: string;
	name: string;
	error: {
		code: string,
		message: string
	}
}

export interface GetMigrationControllerAuthKeysResult {
	authKey1: string,
	authKey2: string
}

export interface GetStorageAccountAccessKeysResult {
	keyName1: string,
	keyName2: string
}

export interface GetMigrationControllerMonitoringData {
	name: string,
	nodes: MigrationControllerNode[];
}

export interface MigrationControllerNode {
	availableMemoryInMB: number,
	concurrentJobsLimit: number
	concurrentJobsRunning: number,
	cpuUtilization: number,
	nodeName: string
	receivedBytes: number
	sentBytes: number
}

export interface StartDatabaseMigrationRequest {
	location: string,
	properties: {
		SourceDatabaseName: string,
		MigrationController: string,
		BackupConfiguration: {
			TargetLocation: {
				StorageAccountResourceId: string,
				AccountKey: string,
			}
			SourceLocation: {
				FileShare: {
					Path: string,
					Username: string,
					Password: string,
				}
			},
		},
		SourceSqlConnection: {
			DataSource: string,
			Username: string,
			Password: string
		},
		Scope: string
	}
}

export interface StartDatabaseMigrationResponse {
	status: number,
	databaseMigration: DatabaseMigration
}

export interface DatabaseMigration {
	properties: DatabaseMigrationProperties;
	id: string;
	name: string;
	type: string;
}
export interface DatabaseMigrationProperties {
	scope: string;
	provisioningState: string;
	migrationStatus: string;
	migrationStatusDetails?: MigrationStatusDetails;
	sourceSqlConnection: SqlConnectionInfo;
	sourceDatabaseName: string;
	targetDatabaseCollation: string;
	migrationController: string;
	migrationOperationId: string;
	backupConfiguration: BackupConfiguration;
	autoCutoverConfiguration: AutoCutoverConfiguration;
	migrationFailureError: ErrorInfo;
}
export interface MigrationStatusDetails {
	migrationState: string;
	startedOn: string;
	endedOn: string;
	fullBackupSetInfo: BackupSetInfo;
	lastRestoredBackupSetInfo: BackupSetInfo;
	activeBackupSets: BackupSetInfo[];
	blobContainerName: string;
	isFullBackupRestored: boolean;
	restoreBlockingReason: string;
	fileUploadBlockingErrors: string[];
	currentRestoringFileName: string;
	lastRestoredFilename: string;
}

export interface SqlConnectionInfo {
	dataSource: string;
	authentication: string;
	username: string;
	password: string;
	encryptConnection: string;
	trustServerCertificate: string;
}

export interface BackupConfiguration {
	sourceLocation: SourceLocation;
	targetLocation: TargetLocation;
}

export interface AutoCutoverConfiguration {
	lastBackupName: string;
}

export interface ErrorInfo {
	code: string;
	message: string;
}

export interface BackupSetInfo {
	backupSetId: string;
	firstLSN: string;
	lastLSN: string;
	backupType: string;
	listOfBackupFiles: BackupFileInfo[];
	backupStartDate: string;
	backupFinishDate: string;
	isBackupRestored: boolean;
	backupSize: number;
	compressedBackupSize: number;
}

export interface SourceLocation {
	fileShare: DatabaseMigrationFileShare;
	azureBlob: DatabaseMigrationAzureBlob;
}

export interface TargetLocation {
	storageAccountResourceId: string;
	accountKey: string;
}

export interface BackupFileInfo {
	fileName: string;
	status: string;
}

export interface DatabaseMigrationFileShare {
	path: string;
	username: string;
	password: string;
}

export interface DatabaseMigrationAzureBlob {
	storageAccountResourceId: string;
	accountKey: string;
	blobContainerName: string;
}
