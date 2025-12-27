
import { Order, MenuItem, OrderStatus } from '../types';

export class GoogleSheetsService {
  private spreadsheetId: string;
  private accessToken: string;

  constructor(spreadsheetId: string, accessToken: string) {
    this.spreadsheetId = spreadsheetId;
    this.accessToken = accessToken;
  }

  private async fetchSheetData(range: string) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${range}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch from Google Sheets');
    }
    return response.json();
  }

  async getOrders(): Promise<Order[]> {
    const data = await this.fetchSheetData('Orders!A2:I1000');
    if (!data.values) return [];
    
    return data.values.map((row: string[]) => ({
      order_id: row[0],
      customer_name: row[1],
      phone: row[2],
      order_type: row[3] as any,
      items: row[4],
      total_amount: row[5],
      payment_status: row[6],
      order_status: row[7] as OrderStatus,
      created_at: row[8],
    })).reverse(); // Newest first
  }

  async getMenu(): Promise<MenuItem[]> {
    const data = await this.fetchSheetData('Menu!A2:D1000');
    if (!data.values) return [];

    return data.values.map((row: string[]) => ({
      item_id: row[0],
      item_name: row[1],
      price: row[2],
      available: row[3] === 'TRUE',
    }));
  }

  async getMeta(key: string): Promise<string | null> {
    const data = await this.fetchSheetData('Meta!A2:B100');
    if (!data.values) return null;
    const found = data.values.find((row: string[]) => row[0] === key);
    return found ? found[1] : null;
  }

  async updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<void> {
    // We need to find the row index first
    const data = await this.fetchSheetData('Orders!A1:A1000');
    const rowIndex = data.values.findIndex((row: string[]) => row[0] === orderId);
    
    if (rowIndex === -1) throw new Error('Order not found');

    const actualRow = rowIndex + 1;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Orders!H${actualRow}?valueInputOption=RAW`;
    
    await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[newStatus]],
      }),
    });
  }

  async updateMenuItem(item: MenuItem): Promise<void> {
    const data = await this.fetchSheetData('Menu!A1:A1000');
    const rowIndex = data.values.findIndex((row: string[]) => row[0] === item.item_id);

    if (rowIndex === -1) throw new Error('Menu item not found');

    const actualRow = rowIndex + 1;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Menu!C${actualRow}:D${actualRow}?valueInputOption=RAW`;
    
    await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[item.price, item.available ? 'TRUE' : 'FALSE']],
      }),
    });
  }

  async updateMeta(key: string, value: string): Promise<void> {
    const data = await this.fetchSheetData('Meta!A1:A100');
    const rowIndex = data.values.findIndex((row: string[]) => row[0] === key);

    let actualRow = rowIndex + 1;
    if (rowIndex === -1) {
      // Append if not found
      actualRow = (data.values?.length || 0) + 1;
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Meta!A${actualRow}:B${actualRow}?valueInputOption=RAW`;
    
    await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[key, value]],
      }),
    });
  }
}
