#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Bytes, BytesN, Env, String, FromVal, IntoVal,
};

const DAY_IN_LEDGERS: u32 = 17280; // ~24 hours in Stellar ledgers

#[derive(Clone)]
#[contracttype]
pub struct SwapOrder {
    pub initiator: Address,
    pub participant: Address,
    pub asset: Address,
    pub amount: i128,
    pub hashlock: BytesN<32>,
    pub timelock: u32,
    pub withdrawn: bool,
    pub refunded: bool,
    pub ethereum_destination: String,
    pub ethereum_amount: String,
    pub ethereum_token: String,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Swap(BytesN<32>),
    Nonce(Address),
}

pub trait StellarHTLCTrait {
    fn initiate_swap(
        env: Env,
        participant: Address,
        asset: Address,
        amount: i128,
        hashlock: BytesN<32>,
        timelock: u32,
        ethereum_destination: String,
        ethereum_amount: String,
        ethereum_token: String,
    ) -> BytesN<32>;
    
    fn withdraw(env: Env, swap_id: BytesN<32>, preimage: Bytes);
    
    fn refund(env: Env, swap_id: BytesN<32>);
    
    fn get_swap(env: Env, swap_id: BytesN<32>) -> SwapOrder;
}

#[contract]
pub struct StellarHTLC;

#[contractimpl]
impl StellarHTLCTrait for StellarHTLC {
    fn initiate_swap(
        env: Env,
        participant: Address,
        asset: Address,
        amount: i128,
        hashlock: BytesN<32>,
        timelock: u32,
        ethereum_destination: String,
        ethereum_amount: String,
        ethereum_token: String,
    ) -> BytesN<32> {
        let initiator = env.current_contract_address();
        
        // Validate inputs
        assert!(amount > 0, "Amount must be greater than 0");
        assert!(timelock > env.ledger().sequence() + 120, "Timelock too short"); // ~10 minutes
        assert!(timelock < env.ledger().sequence() + DAY_IN_LEDGERS, "Timelock too long");
        
        // Get and increment nonce
        let nonce_key = DataKey::Nonce(initiator.clone());
        let nonce: u32 = env.storage().instance().get(&nonce_key).unwrap_or(0);
        env.storage().instance().set(&nonce_key, &(nonce + 1));
        
        // Generate swap ID using hashlock directly
        let swap_id = hashlock.clone();
        
        // Create swap order
        let swap_order = SwapOrder {
            initiator: initiator.clone(),
            participant: participant.clone(),
            asset: asset.clone(),
            amount,
            hashlock: hashlock.clone(),
            timelock,
            withdrawn: false,
            refunded: false,
            ethereum_destination,
            ethereum_amount,
            ethereum_token,
        };
        
        // Store swap
        let swap_key = DataKey::Swap(swap_id.clone());
        env.storage().persistent().set(&swap_key, &swap_order);
        env.storage().persistent().extend_ttl(&swap_key, 0, timelock - env.ledger().sequence() + 1000);
        
        // Transfer tokens to contract
        let token_client = soroban_sdk::token::Client::new(&env, &asset);
        token_client.transfer(&initiator, &env.current_contract_address(), &amount);
        
        // Emit event
        env.events().publish(
            (symbol_short!("swap_init"), swap_id.clone()),
            (initiator, participant, asset, amount, hashlock, timelock),
        );
        
        swap_id
    }
    
    fn withdraw(env: Env, swap_id: BytesN<32>, preimage: Bytes) {
        let swap_key = DataKey::Swap(swap_id.clone());
        let mut swap: SwapOrder = env.storage().persistent().get(&swap_key)
            .expect("Swap does not exist");
        
        // Validate caller
        assert_eq!(env.current_contract_address(), swap.participant, "Not swap participant");
        
        // Validate state
        assert!(!swap.withdrawn, "Already withdrawn");
        assert!(!swap.refunded, "Already refunded");
        
        // Validate timelock
        assert!(env.ledger().sequence() < swap.timelock, "Timelock expired");
        
        // Validate preimage
        let preimage_hash = env.crypto().sha256(&preimage);
        assert_eq!(preimage_hash, swap.hashlock, "Invalid preimage");
        
        // Update state
        swap.withdrawn = true;
        env.storage().persistent().set(&swap_key, &swap);
        
        // Transfer tokens
        let token_client = soroban_sdk::token::Client::new(&env, &swap.asset);
        token_client.transfer(&env.current_contract_address(), &swap.participant, &swap.amount);
        
        // Emit event
        env.events().publish(
            (symbol_short!("withdraw"), swap_id),
            preimage,
        );
    }
    
    fn refund(env: Env, swap_id: BytesN<32>) {
        let swap_key = DataKey::Swap(swap_id.clone());
        let mut swap: SwapOrder = env.storage().persistent().get(&swap_key)
            .expect("Swap does not exist");
        
        // Validate caller
        assert_eq!(env.current_contract_address(), swap.initiator, "Not swap initiator");
        
        // Validate state
        assert!(!swap.withdrawn, "Already withdrawn");
        assert!(!swap.refunded, "Already refunded");
        
        // Validate timelock
        assert!(env.ledger().sequence() >= swap.timelock, "Timelock not expired");
        
        // Update state
        swap.refunded = true;
        env.storage().persistent().set(&swap_key, &swap);
        
        // Transfer tokens back
        let token_client = soroban_sdk::token::Client::new(&env, &swap.asset);
        token_client.transfer(&env.current_contract_address(), &swap.initiator, &swap.amount);
        
        // Emit event
        env.events().publish(
            (symbol_short!("refund"), swap_id),
            swap.initiator,
        );
    }
    
    fn get_swap(env: Env, swap_id: BytesN<32>) -> SwapOrder {
        let swap_key = DataKey::Swap(swap_id);
        env.storage().persistent().get(&swap_key)
            .expect("Swap does not exist")
    }
}

#[cfg(test)]
mod test; 