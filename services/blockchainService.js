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
        validTo
      );

      logger.info('Blockchain registration transaction sent:', { txHash: tx.hash });
      
      const receipt = await tx.wait();
      logger.info('Blockchain registration confirmed:', { 
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber 
      });

      return receipt.transactionHash;

    } catch (error) {
      logger.error('Blockchain registration failed:', { error: error.stack });
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
      
      const statusMap = {
        0: 'VALID',
        1: 'EXPIRED',
        2: 'UPCOMING',
        3: 'INVALID'
      };

      return statusMap[status] || 'UNKNOWN';

    } catch (error) {
      logger.error('Failed to get verification status:', { touristId, error: error.message });
      return 'PENDING';
    }
  }

  async checkConnection() {
    try {
      const network = await this.provider.getNetwork();
      const balance = await this.provider.getBalance(this.wallet.address);
      
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

