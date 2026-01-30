import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Nieprawidłowy adres email' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'Hasło jest wymagane' })
  password: string;
}
