import { describe, expect, it } from 'vitest';
import { service } from '@/mocks/service';
import { useAppStore } from '@/stores/app-store';

describe('데모 로그인 취소', () => {
  it('취소한 요청은 기존 세션을 변경하지 않고 다음 로그인은 성공한다', async () => {
    await service.reset();
    await service.login('jiwoo');
    const controller = new AbortController();
    const pending = service.login('harin', controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(useAppStore.getState().sessionUserId).toBe('jiwoo');
    await service.login('harin');
    expect(useAppStore.getState().sessionUserId).toBe('harin');
  });
});
