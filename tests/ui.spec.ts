import { test, expect } from '@playwright/test';
import { SignJWT } from 'jose';

test('UI Structure', async ({ page, context }) => {
  page.on('console', msg => console.log('Browser console:', msg.text()));

  const secret = new TextEncoder().encode('secret');
  const token = await new SignJWT({ authenticated: true, createdAt: Date.now() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  await context.addCookies([{
    name: 'session',
    value: token,
    domain: 'localhost',
    path: '/',
  }]);

  await page.route('/api/chats*', async route => {
    console.log('Intercepted chats request');
    const json = {
      chats: [
        { jid: '123@s.whatsapp.net', name: 'Test User', kind: 'dm', last_message_ts: Date.now() / 1000 },
        { jid: '456@g.us', name: 'Test Group', kind: 'group', last_message_ts: Date.now() / 1000 - 3600 }
      ]
    };
    await route.fulfill({ json });
  });

  await page.route('/api/messages*', async route => {
    const json = {
      messages: [
        { msg_id: '1', chat_jid: '123@s.whatsapp.net', from_me: 0, text: 'Hello', ts: Date.now() / 1000 - 60 },
        { msg_id: '2', chat_jid: '123@s.whatsapp.net', from_me: 1, text: 'Hi there', ts: Date.now() / 1000 }
      ]
    };
    await route.fulfill({ json });
  });

  await page.goto('http://localhost:3000');

  await expect(page.locator('aside').first()).toBeVisible();
  await expect(page.locator('main').last()).toBeVisible();
  await expect(page.locator('aside').last()).toBeVisible();

  await expect(page.getByText('Test User')).toBeVisible();
  await expect(page.getByText('Test Group')).toBeVisible();

  await page.getByText('Test User').click();

  await expect(page.getByText('Hello')).toBeVisible();
  await expect(page.getByText('Hi there')).toBeVisible();

  const receivedMsg = page.getByText('Hello').locator('..').locator('..');
  const sentMsg = page.getByText('Hi there').locator('..').locator('..');
  
  await expect(receivedMsg).toHaveClass(/mr-auto/);
  await expect(sentMsg).toHaveClass(/ml-auto/);
});
