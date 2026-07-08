export interface ITokenCipher {
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
}
