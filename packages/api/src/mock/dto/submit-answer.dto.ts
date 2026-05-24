import { IsString, MinLength } from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  @MinLength(1)
  answer: string;
}
