import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000, { message: '消息内容不能超过 4000 字符' })
  content: string;
}
