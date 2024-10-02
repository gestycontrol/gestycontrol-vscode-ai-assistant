
# Gestycontrol AI Assistant

## Overview

The **Gestycontrol AI Assistant** is a Visual Studio Code extension that allows users to apply AI processing to multiple files via context menus. This extension integrates with OpenAI's API to improve the readability of code and perform other AI-driven transformations.

## Features

- Process multiple files selected in the Explorer with AI.
- Process the current file from the editor with AI.
- Customizable AI commands to tailor the output.
- Recursively processes files within folders.

## Installation

1. Install the extension from the VSCode marketplace (link will be provided once published).
2. Open your workspace and configure your API key for the AI assistant.

## Commands

The extension provides the following commands, accessible via context menus:

- `Process with AI`: Available in both the Explorer and Editor context menus. This command processes the selected files using AI.

## How to Use

1. Select one or more files in the VSCode Explorer or open a file in the editor.
2. Right-click and select **Process with AI** from the context menu.
3. Enter the command for AI in the input box, or use the default (`Improve its readability`).
4. The selected files will be processed, and the results will be applied directly in the editor.

### Configuration

You need to set up an API key to use the AI functionality:

1. After installing the extension, the extension will prompt you for your OpenAI API key.
2. Enter the API key when prompted. You can update it later in your workspace settings (`aiAssistant.apiKey`).

### Example Usage

For example, you can select a folder in the Explorer and apply AI processing to all files inside by choosing **Process with AI**.

### Known Limitations

- The extension requires an internet connection to work with the OpenAI API.
- Processing large files might take longer, depending on the size and complexity of the code.
- Recursive file processing will only work for valid text documents.

## Development

If you want to contribute or modify this extension:

1. Clone the repository.
2. Run `npm install` to install the dependencies.
3. Use `npm run compile` to build the project.
4. Use `npm run watch` to continuously compile while making changes.

### Scripts

- `compile`: Build the extension using webpack.
- `watch`: Build the extension in watch mode.
- `lint`: Run ESLint on the codebase.
- `test`: Run tests using `vscode-test`.

## License

This extension is licensed under the MIT License.
