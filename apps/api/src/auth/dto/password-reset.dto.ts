import { IsEmail } from 'class-validator';

export class PasswordResetDto {
  @IsEmail({}, { message: 'Nieprawidłowy adres email' })
  email: string;
}
