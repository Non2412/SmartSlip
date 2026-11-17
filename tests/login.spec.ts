import { test, expect } from '@playwright/test';

test.describe('SmartSlip AI - Login Page E2E', () => {
  test('ควร Redirect จากหน้าแรก (/) ไปยังหน้า /login อัตโนมัติ', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('ควรแสดงองค์ประกอบหลักของหน้าเข้าสู่ระบบครบถ้วน', async ({ page }) => {
    await page.goto('/login');

    // ตรวจสอบป้ายสถานะระบบ
    await expect(page.getByText('SmartSlip AI — พร้อมใช้งาน')).toBeVisible();

    // ตรวจสอบข้อความหัวข้อและฟีเจอร์หลัก
    await expect(page.getByText('เข้าสู่ระบบเพื่อเริ่มใช้งาน')).toBeVisible();
    await expect(page.getByText('📄 อ่านสลิปอัตโนมัติ')).toBeVisible();
    await expect(page.getByText('🤖 AI วิเคราะห์')).toBeVisible();
    await expect(page.getByText('📊 รายงานสรุป')).toBeVisible();

    // ตรวจสอบปุ่มเข้าสู่ระบบด้วย LINE
    const lineLoginBtn = page.locator('#line-login-btn');
    await expect(lineLoginBtn).toBeVisible();
    await expect(lineLoginBtn).toBeEnabled();
    await expect(lineLoginBtn).toContainText('เข้าสู่ระบบด้วย LINE');
  });

  test('ควรแสดงข้อความแจ้งเตือนเมื่อมี Query Parameter ?registered=true', async ({ page }) => {
    await page.goto('/login?registered=true');
    await expect(page.getByText('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ')).toBeVisible();
  });
});
