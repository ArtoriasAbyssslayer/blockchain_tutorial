import * as crypto from 'crypto';


//Transaction object in blockchain 
class Transaction{
  public amount: number;
  public payer: string; // public key
  public payee: string; // public key

  constructor(amount: number, payer: string, payee: string) {
    this.amount = amount;
    this.payer = payer;
    this.payee = payee;
  }
  toString() {
    return JSON.stringify(this);
  }
}

class Block {
  public prevHash: string;
  public transaction: Transaction;
  public ts: number;
  

  //nonce value is an 1-time use random number 
  public nonce = Math.round(Math.random()*999999999);
  constructor(prevHash: string, transaction: Transaction, ts: number = Date.now()) {
    this.prevHash = prevHash;
    this.transaction = transaction;
    this.ts = ts;
  }

  get hash(): string {
    const str = JSON.stringify(this);
    const hash = crypto.createHash('sha256');
    hash.update(str).end(); // irreversible hash of the block object
    return hash.digest('hex');
  }


}
class Chain {
  public static instance:  Chain; // Singleton Instance
  chain: Block[]; // Chain is an array of blocks 
  // constructor defines the Genesis Block(fist block of the chain)
  constructor(){
    const genesisTransaction = new Transaction(100, 'Genesis', 'satoshi');
    const genesisBlock = new Block('0', genesisTransaction);
    this.chain = [genesisBlock];
  }

  get lastBlock(){
    return this.chain[this.chain.length-1]; // get the last block of the chain 
  }
  //Implement a transaction with addBlock (require transaction object, publickey, signature)  
  mine(nonce:number){
    let solution = 1;
    console.log('...⛏️  mining ...');
    while (true) {
      const hash = crypto.createHash('MD5');
      hash.update((nonce + solution).toString()).end();
      //attempt to bruteforce find the hash with 0000 as first 4 digits
      const attempt = hash.digest('hex');

      if(attempt.substr(0,4) === '0000'){
        console.log(`Solved: ${solution}`);
        return solution;
      }
      solution += 1;
    }
  }
  addBlock(transaction: Transaction, senderPublicKey: string, signature: Buffer){
    const verifier = crypto.createVerify('SHA256');
    verifier.update(transaction.toString());

    const isValid = verifier.verify(senderPublicKey,signature);

    if(isValid){
      //add block to the chain
      const newBlock = new Block(this.lastBlock.hash, transaction);
        
      //check for double-spend-issue 
      //(before transaction is confirmed they will spend more than the user owns)
      //proof of work using a nonce value 
      this.mine(newBlock.nonce);
      this.chain.push(newBlock);    
    }
  }
  public static getInstance(): Chain{
    if(!Chain.instance){
      Chain.instance = new Chain();
    }
    return Chain.instance;
  }
}
//using wallet class to verify transactions with logging them in wallets and using RSA
class Wallet{
  public publicKey: string;
  public privateKey: string;

  constructor(){
    //synchronous encoding using RSA
    const keypair = crypto.generateKeyPairSync('rsa',{
      modulusLength: 4096,
      publicKeyEncoding: {type: 'spki', format: 'pem'},
      privateKeyEncoding:{type: 'pkcs8', format:'pem'},
    });
    this.privateKey = keypair.privateKey;
    this.publicKey = keypair.publicKey;
  }

  sendMoney(amount: number, payeePublicKey:string){
    const transaction = new Transaction(amount, this.publicKey, payeePublicKey);
    
    //create signature for the transaction using private key and add the public key to the block so the private key is not EXPOSED 
    const sign = crypto.createSign('SHA256');
    //contains timestampe, payer key , payee key 
    sign.update(transaction.toString()).end();

    const signature = sign.sign(this.privateKey); //create OTP - verify using publickey
    //add block to the blockchain 
    const chainInstance = Chain.getInstance();
    chainInstance.addBlock(transaction,this.publicKey, signature);  
  }
}


//example usage 

const satoshi = new Wallet();
const harry = new Wallet();
const alice = new Wallet();



satoshi.sendMoney(50, harry.publicKey);
harry.sendMoney(25, alice.publicKey);
alice.sendMoney(5, harry.publicKey);


console.log(Chain.getInstance());

