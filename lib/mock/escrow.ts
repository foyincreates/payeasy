export const createEscrow = async () => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));
  
  return {
    contractId: "ESCROW_" + Math.random().toString(36).substring(2, 10).toUpperCase(),
  };
};
