/*
=========================================================================
 Version: 2.11
 File: src/openaiService.ts (Cập nhật - Extension)
 Mục đích: Tách hàm `getApiKey` để có thể tái sử dụng.
=========================================================================
*/
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

function getApiKeyPath(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return undefined;
    }
    return path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'openai_apikey.txt');
}

export function saveApiKey(apiKey: string) {
    const keyPath = getApiKeyPath();
    if (!keyPath) {
        vscode.window.showErrorMessage("Please open a workspace folder to save the API key.");
        return;
    }
    const dir = path.dirname(keyPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    fs.writeFileSync(keyPath, apiKey);
}

// Hàm này được export để các module khác có thể kiểm tra key
export function getApiKey(): string | undefined {
    const keyPath = getApiKeyPath();
    if (keyPath && fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath, 'utf-8').trim();
    }
    return undefined;
}

// Hàm này giờ nhận key làm tham số để tăng tính linh hoạt
export async function generateSummary(rawText: string, apiKey: string): Promise<string> {
    const prompt = `hãy tóm tắt đoạn văn sau dưới 256 ký tự, chỉ tạo tóm tắt, không ghi gì thêm: ${rawText}`;

    try {
        const fetch = (await import('node-fetch')).default;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 256,
                temperature: 0.5,
            })
        });

        if (!response.ok) {
            const errorData = await response.json() as { error?: { message?: string } };
            throw new Error(`OpenAI API Error: ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data: any = await response.json();
        return data.choices[0].message.content.trim();

    } catch (error: any) {
        console.error("Error calling OpenAI API:", error);
        throw new Error(`Failed to generate summary: ${error.message}`);
    }
}