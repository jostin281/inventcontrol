import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class EliminarOrganizacionDto {
  @IsString() @MinLength(1)
  password: string;
}

export class ActualizarPerfilNegocioDto {
  @IsOptional() @IsString() @MaxLength(100)
  nombreNegocio?: string;

  @IsOptional() @IsEmail()
  correoOperaciones?: string;

  @IsOptional() @IsString() @MaxLength(300)
  direccion?: string;

  @IsOptional() @IsString() @MaxLength(50)
  zona?: string;

  @IsOptional() @IsString() @MaxLength(10)
  moneda?: string;

  // Data URL completa del logo (o null para quitarlo). El tamaño se valida
  // en el service, no acá: medirlo bien requiere decodificar el base64.
  @IsOptional() @IsString()
  logo?: string | null;
}
