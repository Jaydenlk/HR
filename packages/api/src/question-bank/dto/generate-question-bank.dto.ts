import { IsString, MinLength } from 'class-validator';

export class GenerateQuestionBankDto {
  @IsString()
  @MinLength(1)
  company: string;

  @IsString()
  @MinLength(1)
  role: string;
}
