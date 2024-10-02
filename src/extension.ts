import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('extension.processFiles', async (uri?: vscode.Uri[]) => {
		const apiKey = await getApiKey();

		if (!apiKey) {
			vscode.window.showErrorMessage('No API key provided.');
			return;
		}

		// If multiple files are selected from the context menu
		const files = uri ? uri : [vscode.window.activeTextEditor?.document.uri];

		if (!files || files.length === 0) {
			vscode.window.showInformationMessage('No files selected for processing.');
			return;
		}

		// Progress notification, this will remain until all files are processed
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: `Processing ${files.length} file(s) with AI assistant...`,
			cancellable: false // Ensure the process is not cancellable by user
		}, async (progress) => {

			for (let i = 0; i < files.length; i++) {
				const document = await vscode.workspace.openTextDocument(files[i]);
				const text = document.getText();

				// Show progress update for each file
				progress.report({ message: `Processing ${i + 1} of ${files.length} files...` });

				try {
					const aiResponse = await processWithAI(text, apiKey);

					const edit = new vscode.WorkspaceEdit();
					edit.replace(document.uri, new vscode.Range(
						document.positionAt(0),
						document.positionAt(text.length)
					), aiResponse);
					await vscode.workspace.applyEdit(edit);

					vscode.window.showInformationMessage(`File ${document.uri.fsPath} was processed by AI.`);
				} catch (error) {
					vscode.window.showErrorMessage(`Error processing file ${document.uri.fsPath} with AI: ${error.message}`);
				}
			}

			// Returning to ensure the progress dialog stays until processing completes
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
		if (error instanceof Error) {
			vscode.window.showErrorMessage('Failed to process with AI: ' + error.message);
		} else {
			vscode.window.showErrorMessage('Failed to process with AI: An unknown error occurred.');
		}

		throw error;
	}
}

export function deactivate() { }
