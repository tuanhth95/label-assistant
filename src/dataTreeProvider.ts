/*
=========================================================================
 Version: 1.5
 File: src/dataTreeProvider.ts (Cập nhật - Extension)
 Mục đích: Thêm logic kiểm tra file `.submitted` để thay đổi `contextValue`.
=========================================================================
*/
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class DataTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private workspaceRoot: string | undefined) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (!this.workspaceRoot) {
            return Promise.resolve([]);
        }
        const labelingPath = path.join(this.workspaceRoot, '.labeling');

        if (element) { // Lấy các file .lbl
            const files = fs.readdirSync(element.resourceUri!.fsPath).filter(f => f.endsWith('.lbl'));
            return Promise.resolve(files.map(file => {
                const filePath = path.join(element.resourceUri!.fsPath, file);
                let isLabeled = false;
                try {
                    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                    isLabeled = content.anchor_text && content.anchor_text.trim() !== "";
                } catch (e) {}
                
                const treeItem = new vscode.TreeItem(file, vscode.TreeItemCollapsibleState.None);
                treeItem.command = { command: 'vscode.open', title: 'Open Label File', arguments: [vscode.Uri.file(filePath)] };
                treeItem.iconPath = isLabeled ? new vscode.ThemeIcon('check', new vscode.ThemeColor('terminal.ansiGreen')) : new vscode.ThemeIcon('circle-outline');
                return treeItem;
            }));
        } else { // Lấy các thư mục Iter
            if (fs.existsSync(labelingPath)) {
                const dirs = fs.readdirSync(labelingPath)
                    .filter(d => fs.statSync(path.join(labelingPath, d)).isDirectory() && d.startsWith('iter_'))
                    .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));

                return Promise.resolve(dirs.map(dir => {
                    const dirPath = path.join(labelingPath, dir);
                    const iterItem = new vscode.TreeItem(dir.replace('iter_', 'Iter '), vscode.TreeItemCollapsibleState.Collapsed);
                    iterItem.resourceUri = vscode.Uri.file(dirPath);
                    
                    // Kiểm tra xem đã submit chưa
                    const isSubmitted = fs.existsSync(path.join(dirPath, '.submitted'));
                    if (isSubmitted) {
                        iterItem.contextValue = 'iteration_submitted';
                        iterItem.iconPath = new vscode.ThemeIcon('folder-opened');
                    } else {
                        iterItem.contextValue = 'iteration';
                        iterItem.iconPath = new vscode.ThemeIcon('folder');
                    }
                    return iterItem;
                }));
            }
            return Promise.resolve([]);
        }
    }
}