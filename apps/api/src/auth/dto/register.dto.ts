import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Nieprawidłowy adres email' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Hasło musi mieć minimum 8 znaków' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Hasło musi zawierać małą i wielką literę oraz cyfrę',
  })
  password: string;
}
