import * as vscode from 'vscode';

export class MainActionsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private isConnected: boolean = false;
  private configExists: boolean = false;

  refresh(isConnected: boolean, configExists: boolean): void {
      this.isConnected = isConnected;
      this.configExists = configExists;
      this._onDidChangeTreeData.fire();
  }
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem { return element;}

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    // Nếu không có element cha, trả về các mục ở cấp cao nhất
    if (!element) {
      if (!this.isConnected) {
            const connectItem = new vscode.TreeItem("Connect to Server");
            connectItem.command = { command: 'labeling.connect', title: 'Connect' };
            connectItem.iconPath = new vscode.ThemeIcon('debug-disconnect');
            return Promise.resolve([connectItem]);
        }

        const processButtonText = this.configExists ? "Continue Process" : "Start Process";
        const processItem = new vscode.TreeItem(processButtonText);
        processItem.command = { command: 'labeling.openProcessView', title: processButtonText };
        processItem.iconPath = new vscode.ThemeIcon('gear');

        const chartItem = new vscode.TreeItem("Show Chart");
        chartItem.command = { command: 'labeling.showChart', title: 'Show Chart' };
        chartItem.iconPath = new vscode.ThemeIcon('graph');

        const disconnectItem = new vscode.TreeItem("Disconnect to Server");
        disconnectItem.command = { command: 'labeling.disconnect', title: 'Disconnect' };
        disconnectItem.iconPath = new vscode.ThemeIcon('debug-stop');

        return Promise.resolve([processItem, chartItem, disconnectItem]);
    }

    return Promise.resolve([]);
  }
}