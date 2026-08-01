import { IsString, IsEmail, IsOptional, MinLength, IsIn } from 'class-validator';

export class CreateUsuarioDto {
  @IsString() @MinLength(3)
  nombre: string;

  @IsEmail()
  correo: string;

  @IsString() @MinLength(8)
  contrasena: string;

  @IsOptional() @IsString()
  nombreNegocio?: string;

  @IsOptional() @IsString()
  tipoNegocio?: string;

  @IsOptional() @IsIn(['admin', 'usuario'])
  rol?: 'admin' | 'usuario';
}

export class LoginDto {
  @IsEmail()
  correo: string;

  @IsString() @MinLength(6)
  contrasena: string;
}
