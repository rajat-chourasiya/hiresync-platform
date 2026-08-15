import 'dotenv/config';

const API_URL = process.env.API_URL;

if (!API_URL) {
  console.error('❌ API_URL is not configured');
  process.exit(1);
}

const services = [
  {
    name: 'PostgreSQL',
    endpoint: '/health/database',
  },
  {
    name: 'Redis',
    endpoint: '/health/redis',
  },
  {
    name: 'Cloudinary',
    endpoint: '/health/cloudinary',
  },
  {
    name: 'Email / Resend',
    endpoint: '/health/email',
  },
  {
    name: 'Stream',
    endpoint: '/health/stream',
  },
  {
    name: 'Gemini',
    endpoint: '/health/gemini',
  },
  {
    name: 'Groq',
    endpoint: '/health/groq',
  },
  {
    name: 'Razorpay',
    endpoint: '/health/razorpay',
  },
];

console.log('');
console.log('========================================');
console.log('       🚀 HireSync Service Health');
console.log('========================================');
console.log('');
console.log(`Checking: ${API_URL}`);
console.log('');

const checkService = async (service) => {
  const start = Date.now();

  try {
    const response = await fetch(`${API_URL}${service.endpoint}`);

    const data = await response.json();

    const duration = Date.now() - start;

    if (response.ok && data.status === 'ok') {
      console.log(`✅ ${service.name.padEnd(18)} Connected (${duration}ms)`);

      return true;
    }

    console.log(`❌ ${service.name.padEnd(18)} Failed`);

    if (data.message) {
      console.log(`   └─ ${data.message}`);
    }

    return false;
  } catch (error) {
    console.log(`❌ ${service.name.padEnd(18)} Failed`);

    console.log(`   └─ ${error instanceof Error ? error.message : 'Unknown error'}`);

    return false;
  }
};

try {
  const results = await Promise.all(services.map(checkService));

  const allConnected = results.every(Boolean);

  console.log('');
  console.log('========================================');

  if (allConnected) {
    console.log('       ✅ All Services Connected');
  } else {
    console.log('       ❌ Some Services Failed');
  }

  console.log('========================================');
  console.log('');

  process.exit(allConnected ? 0 : 1);
} catch (error) {
  console.log('');
  console.log('❌ Unable to connect to HireSync API');

  console.log(`   └─ ${error instanceof Error ? error.message : 'Unknown error'}`);

  process.exit(1);
}
