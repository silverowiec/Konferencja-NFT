# This script generates a new Ethereum private key and prints it for MetaMask import.
# WARNING: Keep your private key secure! Anyone with this key can control your wallet.


# run 'pip3 install eth_account' before
from eth_account import Account
import secrets

# Generate a random 32-byte hex string (private key)
private_key = '0x' + secrets.token_hex(32)

# Create an account object
acct = Account.from_key(private_key)

print('--- MetaMask Import Information ---')
print(f'Private Key: {private_key}')
print(f'Address:    {acct.address}')
print('\nCopy the private key above and import it into MetaMask.')
