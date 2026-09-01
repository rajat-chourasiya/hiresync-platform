import { Controller, Post, Body } from '@nestjs/common';
import { OtpService } from './otp.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Controller('otp')
export class OtpController {
  constructor(private otpService: OtpService) {}

  @Post('send')
  send(@Body() dto: SendOtpDto) {
    return this.otpService.send(dto.email, dto.purpose);
  }

  @Post('verify')
  verify(@Body() dto: VerifyOtpDto) {
    return this.otpService.verify(dto.email, dto.purpose, dto.otp);
  }
}