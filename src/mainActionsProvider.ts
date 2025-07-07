import * as vscode from 'vscode';

export class MainActionsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    // Nếu không có element cha, trả về các mục ở cấp cao nhất
    if (!element) {
      const startItem = new vscode.TreeItem("Start Process");
      startItem.command = { command: 'labeling.start', title: 'Start' };
      startItem.iconPath = new vscode.ThemeIcon('play-circle');
      startItem.tooltip = "Start the connection to the server and begin the labeling process.";

      const chartItem = new vscode.TreeItem("Show Chart");
      chartItem.command = { command: 'labeling.showChart', title: 'Show Chart' };
      chartItem.iconPath = new vscode.ThemeIcon('graph');
      chartItem.tooltip = "Open a new tab to view model performance.";

      return Promise.resolve([startItem, chartItem]);
    }

    return Promise.resolve([]);
  }
}