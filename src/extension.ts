import * as vscode from 'vscode';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('extension.processFiles', async (uriList?: vscode.Uri[]) => {
		const apiKey = await getApiKey();

		if (!apiKey) {
			vscode.window.showErrorMessage('No API key provided.');
			return;
		}

		let files: vscode.Uri[] = [];

		console.log(`Received URIs: ${uriList?.length || 0}`);

		if (uriList && uriList.length > 0) {
			for (const uri of uriList) {
				const stat = await vscode.workspace.fs.stat(uri);

				if (stat.type === vscode.FileType.File) {
					console.log(`Found file: ${uri.fsPath}`);
					files.push(uri);
				} else if (stat.type === vscode.FileType.Directory) {
					console.log(`Found directory: ${uri.fsPath}`);
					const folderFiles = await getFilesInFolder(uri.fsPath);
					console.log(`Found ${folderFiles.length} files in directory`);
					files = files.concat(folderFiles);
				}
			}
		} else if (vscode.window.activeTextEditor?.document.uri) {
			files = [vscode.window.activeTextEditor.document.uri];
		}

		console.log(`Total files to process: ${files.length}`);

		if (files.length === 0) {
			vscode.window.showErrorMessage('No valid files selected for processing.');
			return;
		}

		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: `Processing ${files.length} file(s) with AI assistant...`,
			cancellable: false
		}, async (progress) => {
			for (let i = 0; i < files.length; i++) {
				const fileUri = files[i];
				if (!fileUri) {
					vscode.window.showErrorMessage(`File ${i + 1} is undefined. Skipping.`);
					continue;
				}

				progress.report({ message: `Processing file ${i + 1} of ${files.length}...` });
				console.log(`Processing file ${i + 1} of ${files.length}`);
				try {
					const document = await vscode.workspace.openTextDocument(fileUri);
					const text = document.getText();

					const aiResponse = await processWithAI(text, apiKey);

					const edit = new vscode.WorkspaceEdit();
					edit.replace(document.uri, new vscode.Range(
						document.positionAt(0),
						document.positionAt(text.length)
					), aiResponse);
					await vscode.workspace.applyEdit(edit);

					vscode.window.showInformationMessage(`File ${document.uri.fsPath} was processed by AI.`);

					await vscode.commands.executeCommand('editor.action.formatDocument', document);

				} catch (error) {
					vscode.window.showErrorMessage(`Error processing file ${fileUri.fsPath}: ${error.message}`);
				}
			}

			return;
		});
	});

	context.subscriptions.push(disposable);
}

async function getApiKey(): Promise<string | undefined> {
	const config = vscode.workspace.getConfiguration('aiAssistant');
	let apiKey = config.get<string>('apiKey');

	if (!apiKey) {
		apiKey = await vscode.window.showInputBox({
			prompt: 'Please enter your API key for the AI assistant',
			ignoreFocusOut: true,
			password: true,
		});

		if (apiKey) {
			await config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
			vscode.window.showInformationMessage('API key saved successfully.');
		}
	}

	return apiKey;
}

async function getFilesInFolder(folderPath: string): Promise<vscode.Uri[]> {
	let files: vscode.Uri[] = [];

	async function readDirectory(directory: string): Promise<void> {
		const dirEntries = await fs.promises.readdir(directory, { withFileTypes: true });

		for (const entry of dirEntries) {
			const fullPath = path.join(directory, entry.name);

			if (entry.isDirectory()) {
				await readDirectory(fullPath);
			} else if (entry.isFile()) {
				files.push(vscode.Uri.file(fullPath));
			}
		}
	}

	await readDirectory(folderPath);
	return files;
}

async function processWithAI(text: string, apiKey: string): Promise<string> {
	try {
		const inputTokenCount = Math.ceil(text.length / 4);
		const maxTotalTokens = 8192;
		const maxOutputTokens = Math.min(1000, maxTotalTokens - inputTokenCount);

		const response = await axios.post('https://api.openai.com/v1/chat/completions', {
			model: 'gpt-4',
			messages: [
				{ role: 'user', content: `Please process the following code and improve its readability. Return the full code, without adding conversational notes:\n\n${text}` }
			],
			max_tokens: maxOutputTokens,
			temperature: 0.7
		}, {
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			}
		});

		if (response.data?.choices?.[0]?.message) {
			return response.data.choices[0].message.content.trim();
		} else {
			throw new Error('Invalid response structure from AI API.');
		}

	} catch (error) {
		vscode.window.showErrorMessage('Failed to process with AI: ' + (error instanceof Error ? error.message : 'An unknown error occurred.'));
		throw error;
	}
}

export function deactivate() { }
