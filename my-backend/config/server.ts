import cron from './cron'; // import ไฟล์เมื่อกี้

export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  cron: { // ⭐ เพิ่มตรงนี้
    enabled: true,
    tasks: cron,
  },
});