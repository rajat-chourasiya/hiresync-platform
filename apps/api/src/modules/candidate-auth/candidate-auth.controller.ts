import { Controller, Post, Body } from '@nestjs/common';
import { CandidateAuthService } from './candidate-auth.service';
import { RequestCandidateLoginDto, VerifyCandidateLoginDto } from './dto/candidate-login.dto';

@Controller('candidate-auth')
export class CandidateAuthController {
  constructor(private candidateAuthService: CandidateAuthService) {}

  @Post('login/request')
  request(@Body() dto: RequestCandidateLoginDto) {
    return this.candidateAuthService.requestLogin(dto.orgId, dto.email);
  }

  @Post('login/verify')
  verify(@Body() dto: VerifyCandidateLoginDto) {
    return this.candidateAuthService.verifyLogin(dto.orgId, dto.email, dto.otp);
  }
}