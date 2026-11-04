import { defineAuth } from 'void/auth';

export default defineAuth(({ defaults }) => ({
  ...defaults,
  appName: 'famuse',
}));
