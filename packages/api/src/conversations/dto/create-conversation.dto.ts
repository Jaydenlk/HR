import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  context_type?: string;

  @IsOptional()
  @IsUUID()
  context_id?: string;
}
