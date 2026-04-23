export interface WalletData {
  address: string;
  balance: number;
  network: "testnet" | "mainnet";
}

export interface Transaction {
  id: string;
  type: "send" | "receive";
  amount: number;
  status: "success" | "pending" | "failed";
  date: string;
}

export const getWalletData = async (): Promise<WalletData> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));
  
  return {
    address: "GABC1234XYZ5678QWERTYUIOP9012ASDFGHJKL3456ZXCVBNM",
    balance: 120.5,
    network: "testnet",
  };
};

export const getRecentTransactions = async (): Promise<Transaction[]> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  return [
    {
      id: "tx1",
      type: "receive",
      amount: 50.0,
      status: "success",
      date: "2026-04-20T10:30:00Z",
    },
    {
      id: "tx2",
      type: "send",
      amount: 10.0,
      status: "success",
      date: "2026-04-19T14:15:00Z",
    },
    {
      id: "tx3",
      type: "send",
      amount: 5.5,
      status: "pending",
      date: "2026-04-18T09:45:00Z",
    },
    {
      id: "tx4",
      type: "receive",
      amount: 100.0,
      status: "success",
      date: "2026-04-15T16:20:00Z",
    },
    {
      id: "tx5",
      type: "send",
      amount: 25.0,
      status: "failed",
      date: "2026-04-10T11:10:00Z",
    },
  ];
};
