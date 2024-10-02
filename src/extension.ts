import * as vscode from 'vscode';
import axios from 'axios';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
	const processFilesWithAI = async (uris: vscode.Uri[]) => {
		const apiKey = await getApiKey();

		if (!apiKey) {
			vscode.window.showErrorMessage('No API key provided.');
			return;
		}

		const command = await vscode.window.showInputBox({
			prompt: 'Please provide a command for the AI',
			ignoreFocusOut: true,
			value: 'Improve its readability',
		}) || 'Improve its readability';

		const increment = (1 / uris.length) * 100;

		const progressOptions: vscode.ProgressOptions = {
			location: vscode.ProgressLocation.Notification,
			title: 'Processing files with AI',
			cancellable: true,
		};

		vscode.window.withProgress(progressOptions, async (progress, cancellationToken) => {
			for (let i = 0; i < uris.length; i++) {
				const uri = uris[i];
				if (cancellationToken.isCancellationRequested) {
					break;
				}
				try {
					progress.report({
						message: `Processing file ${i + 1}/${uris.length}`,
					});
					const document = await vscode.workspace.openTextDocument(uri);
					const text = document.getText();

					const aiResponse = await processWithAI(text, apiKey, command);

					const edit = new vscode.WorkspaceEdit();
					edit.replace(document.uri, new vscode.Range(
						document.positionAt(0),
						document.positionAt(text.length)
					), aiResponse);
					await vscode.workspace.applyEdit(edit);

					await vscode.commands.executeCommand('editor.action.formatDocument', document);

				} catch (exception) {
					vscode.window.showWarningMessage(`Could not process file ${uri.fsPath}`);
				}
				progress.report({
					increment: increment,
				});
			}
		});
	};

	const getRecursiveUris = async (uris: vscode.Uri[]) => {
		let outputUris: vscode.Uri[] = [];
		for (const uri of uris) {
			if (fs.existsSync(uri.fsPath)) {
				if (fs.lstatSync(uri.fsPath).isDirectory()) {
					const relativePattern = new vscode.RelativePattern(uri.fsPath, '**/*');
					outputUris = [...outputUris, ...await vscode.workspace.findFiles(relativePattern)];
				} else {
					outputUris.push(uri);
				}
			}
		}
		return outputUris;
	};

	context.subscriptions.push(
		vscode.commands.registerCommand('extension.processFilesFromExplorerContext', async (clickedFile: vscode.Uri, selectedFiles: vscode.Uri[]) => {
			const uris = await getRecursiveUris(selectedFiles || [clickedFile]);
			await processFilesWithAI(uris);
		}),

		vscode.commands.registerCommand('extension.processFileFromEditorContext', async (clickedFile: vscode.Uri) => {
			await processFilesWithAI([clickedFile]);
		})
	);
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

async function processWithAI(text: string, apiKey: string, command: string): Promise<string> {
	try {
		const inputTokenCount = Math.ceil(text.length / 4);
		const maxTotalTokens = 8192;
		const maxOutputTokens = Math.min(1000, maxTotalTokens - inputTokenCount);

		const response = await axios.post('https://api.openai.com/v1/chat/completions', {
			model: 'gpt-4',
			messages: [
				{ role: 'user', content: `Please process the following code and ${command}. Use trailing commas when possible if the language supports it (never for function arguments). Avoid changing line breaks.\n\n${text}` }
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
