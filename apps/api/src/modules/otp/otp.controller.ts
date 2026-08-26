import { Controller, Post, Body } from '@nestjs/common';
import { OtpService } from './otp.service';

@Controller('otp')
export class OtpController {
  constructor(private otpService: OtpService) {}

  @Post('send')
  send(@Body() dto: { email: string; purpose: string }) {
    return this.otpService.send(dto.email, dto.purpose);
  }

  @Post('verify')
  verify(@Body() dto: { email: string; purpose: string; otp: string }) {
    return this.otpService.verify(dto.email, dto.purpose, dto.otp);
  }
}