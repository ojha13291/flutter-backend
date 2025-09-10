// // services/blockchainService.js
// const { ethers } = require('ethers');
// const contractABI = require('../config/contractABI.json');
// const logger = require('../utils/logger');

// // Initialize connection
// const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
// const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;
// const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// let provider, wallet, touristContract;

// try {
//   provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
//   wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
//   touristContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);
// } catch (error) {
//   logger.warn('Blockchain connection failed:', { error: error.message });
// }

// const STATUS_MAP = {
//   0: 'VALID',
//   1: 'EXPIRED', 
//   2: 'UPCOMING',
//   3: 'INVALID'
// };

// // Service functions
// const registerTourist = async (name, aadharHash, tripId, validFrom, validTo) => {
//   try {
//     if (!touristContract) throw new Error('Blockchain not connected');
    
//     logger.info('Sending transaction to register tourist...');
//     const tx = await touristContract.registerTourist(name, aadharHash, tripId, validFrom, validTo);
//     await tx.wait();
//     logger.info('Transaction confirmed:', { hash: tx.hash });
//     return tx;
//   } catch (error) {
//     logger.error('Blockchain registration failed:', { error: error.message });
//     throw error;
//   }
// };

// const getTouristDetails = async (touristId) => {
//   try {
//     if (!touristContract) throw new Error('Blockchain not connected');
    
//     const details = await touristContract.getTouristDetails(touristId);
//     return {
//       id: Number(details.id),
//       name: details.name,
//       tripId: details.tripId,
//       validFrom: Number(details.validFrom),
//       validTo: Number(details.validTo),
//       exists: details.exists
//     };
//   } catch (error) {
//     logger.error('Failed to get tourist details:', { touristId, error: error.message });
//     throw error;
//   }
// };

// const getVerificationStatus = async (touristId) => {
//   try {
//     if (!touristContract) {
//       logger.warn('Blockchain not connected, returning PENDING status');
//       return 'PENDING';
//     }
    
//     const statusEnum = await touristContract.getVerificationStatus(touristId);
//     return STATUS_MAP[Number(statusEnum)] || 'UNKNOWN';
//   } catch (error) {
//     logger.warn('Blockchain verification failed:', { touristId, error: error.message });
//     return 'PENDING'; // Fallback status
//   }
// };

// const logVerificationAttempt = async (touristId) => {
//   try {
//     if (!touristContract) throw new Error('Blockchain not connected');
    
//     const tx = await touristContract.logVerificationAttempt(touristId);
//     const receipt = await tx.wait();
//     const currentStatus = await getVerificationStatus(touristId);
    
//     return {
//       status: currentStatus,
//       hash: tx.hash
//     };
//   } catch (error) {
//     logger.error('Failed to log verification attempt:', { touristId, error: error.message });
//     throw error;
//   }
// };

// module.exports = {
//   registerTourist,
//   getTouristDetails,
//   getVerificationStatus,
//   logVerificationAttempt
// };

const { ethers } = require('ethers');
const contractABI = require('../config/contractABI.json');
const logger = require('../utils/logger');

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    this.wallet = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      contractABI,
      this.wallet
    );
  }

  async registerTourist({ name, aadharHash, tripId, validFrom, validTo }) {
    try {
      logger.info('Registering tourist on blockchain:', { name, tripId });

      const tx = await this.contract.registerTourist(
        name,
        aadharHash,
        tripId,
        validFrom,
        validTo,
        {
          gasLimit: 300000,
          gasPrice: ethers.parseUnits('20', 'gwei')
        }
      );

      logger.info('Blockchain registration transaction sent:', { txHash: tx.hash });
      
      const receipt = await tx.wait();
      logger.info('Blockchain registration confirmed:', { 
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber 
      });

      return receipt.transactionHash;

    } catch (error) {
      logger.error('Blockchain registration failed:', { error: error.message });
      throw new Error(`Blockchain registration failed: ${error.message}`);
    }
  }

  async getTouristDetails(touristId) {
    try {
      const details = await this.contract.getTouristDetails(touristId);
      
      return {
        id: details.id.toString(),
        name: details.name,
        tripId: details.tripId,
        validFrom: new Date(Number(details.validFrom) * 1000),
        validTo: new Date(Number(details.validTo) * 1000),
        exists: details.exists
      };

    } catch (error) {
      logger.error('Failed to get tourist details:', { touristId, error: error.message });
      throw new Error(`Failed to get tourist details: ${error.message}`);
    }
  }

  async getVerificationStatus(touristId) {
    try {
      const status = await this.contract.getVerificationStatus(touristId);
      
      // Convert numeric status to string
      const statusMap = {
        0: 'PENDING',
        1: 'VALID',
        2: 'EXPIRED',
        3: 'INVALID'
      };

      return statusMap[status] || 'UNKNOWN';

    } catch (error) {
      logger.error('Failed to get verification status:', { touristId, error: error.message });
      // Return PENDING instead of throwing error for graceful degradation
      return 'PENDING';
    }
  }

  async checkConnection() {
    try {
      const network = await this.provider.getNetwork();
      const balance = await this.wallet.getBalance();
      
      logger.info('Blockchain service connection check:', {
        network: network.name,
        chainId: network.chainId.toString(),
        balance: ethers.formatEther(balance) + ' ETH'
      });

      return {
        connected: true,
        network: network.name,
        chainId: network.chainId.toString(),
        balance: ethers.formatEther(balance)
      };

    } catch (error) {
      logger.error('Blockchain connection failed:', { error: error.message });
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

module.exports = new BlockchainService();
