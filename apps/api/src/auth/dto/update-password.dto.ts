import { IsString, MinLength, Matches } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  @MinLength(8, { message: 'Hasło musi mieć minimum 8 znaków' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Hasło musi zawierać małą literę, wielką literę i cyfrę',
  })
  password: string;
}
