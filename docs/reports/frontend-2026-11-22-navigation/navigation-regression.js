// Playwright CLI run-code; isolated browser signed in as 지우, Vite dev seed data.
async (page) => {
  try {
    const base = new URL(page.url()).origin;
    const video = '/teams/padong/occurrences/rehearsal-1/videos/video-1';
    const results = [];
    const check = (value, message) => { if (!value) throw new Error(message); };
    const dialog = page.getByRole('dialog', { name: '저장하지 않은 내용을 버릴까요?' });
    const keep = async () => { await dialog.getByRole('button', { name: '계속 작성' }).click(); await dialog.waitFor({ state: 'hidden' }); };
    const discard = async () => { await dialog.getByRole('button', { name: '버리고 이동' }).click(); await dialog.waitFor({ state: 'hidden' }); };
    const go = async (path) => { await page.goto(base + path); await page.locator('.demo-tools').waitFor(); };
    const store = async () => page.evaluate(async () => (await import('/src/stores/app-store.ts')).useAppStore.getState());
    const unload = async () => page.evaluate(() => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
    const fail = async () => page.evaluate(async () => (await import('/src/stores/app-store.ts')).useAppStore.setState({ failNext: true }));
    await page.evaluate(async () => { const { service } = await import('/src/mocks/service.ts'); await service.reset(); await service.login('jiwoo'); });
    await go('/teams');
    await page.getByRole('button', { name: '팀 만들기', exact: true }).click();
    const name = page.getByPlaceholder('예: 파동 극단');
    await name.fill('미저장 팀');
    check(await unload(), 'dirty beforeunload absent');
    await page.goBack(); await keep();
    check(page.url().endsWith('/teams/new') && await name.inputValue() === '미저장 팀', 'back cancel lost draft or URL');
    await page.goBack(); await discard();
    await page.waitForURL('**/teams');
    await page.goForward(); await name.waitFor();
    await page.goBack(); await page.waitForURL('**/teams');
    await page.getByRole('button', { name: '팀 만들기', exact: true }).click();
    await name.fill('전환 보호');
    await page.getByLabel('팀 전환').selectOption('padong'); await keep();
    check(page.url().endsWith('/teams/new') && await name.inputValue() === '전환 보호', 'team navigate cancel');
    await page.locator('.demo-tools summary').click();
    await page.getByRole('button', { name: '계정 전환', exact: true }).click(); await keep();
    const originalSession = (await store()).sessionUserId;
    await page.getByRole('button', { name: '로그아웃', exact: true }).click(); await keep();
    check((await store()).sessionUserId === originalSession, 'logout cancel mutated session');
    await page.evaluate(() => { window.__navigationConfirmOriginal = window.confirm; window.confirm = () => true; });
    const beforeReset = JSON.stringify((await store()).teams);
    await page.getByRole('button', { name: '데모 초기화', exact: true }).click(); await keep();
    check(JSON.stringify((await store()).teams) === beforeReset && (await store()).sessionUserId === originalSession, 'reset cancel mutated');
    await fail(); await page.getByRole('button', { name: '팀 만들기', exact: true }).click();
    await page.getByRole('alert').waitFor();
    await page.getByRole('link', { name: '내 일정', exact: true }).click(); await keep();
    check(await name.inputValue() === '전환 보호', 'failed team input lost');
    await page.getByRole('button', { name: '팀 만들기', exact: true }).click();
    await page.waitForURL(/\/teams\/(?!new)[^/]+$/);
    check(!await dialog.isVisible() && !await unload(), 'saved team remains protected');
    results.push('team: back cancel/allow, forward, team switch, account/logout/reset cancel, failure/retry, beforeunload PASS');

    await go('/teams/padong/scheduling');
    await page.getByRole('button', { name: '발표 예시 채우기' }).click();
    await page.getByRole('link', { name: '내 일정', exact: true }).click(); await keep();
    check(await unload(), 'example reset not dirty');
    await fail(); await page.getByRole('button', { name: /추천.*조회|시간.*찾기/ }).click();
    await page.getByRole('alert').waitFor();
    check(await unload(), 'saveDraft failure dropped guard');
    await page.getByRole('button', { name: /추천.*조회|시간.*찾기/ }).click();
    await page.waitForURL('**/scheduling/results');
    check(!await dialog.isVisible() && !await unload(), 'recommend success false prompt');
    results.push('scheduling: example dirty, save failure, retry success PASS');

    await go(video);
    const body = page.getByLabel('이 영상에 대한 피드백');
    await body.fill('회귀 피드백 ' + Date.now());
    const draft = await body.inputValue();
    await page.locator('a.back-link').click(); await keep();
    check(await body.inputValue() === draft, 'feedback navigation lost input');
    await fail(); await page.getByRole('button', { name: '피드백 등록', exact: true }).click();
    await page.getByRole('alert').waitFor();
    await page.locator('a.back-link').click(); await keep();
    check(await body.inputValue() === draft, 'feedback failure lost input');
    await page.getByRole('button', { name: '피드백 등록', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#feedback-body').value === '');
    check(!await unload(), 'feedback success dirty');
    const comment = page.locator('article.comment').last();
    await comment.getByRole('button', { name: '수정', exact: true }).click();
    await page.getByLabel('피드백 수정').fill('수정 미저장');
    await comment.getByRole('button', { name: '취소', exact: true }).click(); await keep();
    check(await page.getByLabel('피드백 수정').inputValue() === '수정 미저장', 'edit cancel lost');
    await page.locator('a.back-link').click(); await keep();
    await fail(); await comment.getByRole('button', { name: '수정 저장', exact: true }).click();
    await page.getByRole('alert').waitFor();
    check(await page.getByLabel('피드백 수정').inputValue() === '수정 미저장', 'edit failure lost');
    await comment.getByRole('button', { name: '수정 저장', exact: true }).click();
    await page.getByLabel('피드백 수정').waitFor({ state: 'hidden' });
    check(!await unload(), 'edit save dirty');
    await body.fill('모달과 동시 입력');
    await page.locator('.page-header').getByRole('button', { name: '수정', exact: true }).click();
    const videoModal = page.getByRole('dialog', { name: '영상 수정', exact: true });
    await videoModal.getByLabel('영상 제목', { exact: true }).fill('새 영상 제목');
    await videoModal.getByRole('button', { name: '변경 저장' }).click();
    await videoModal.waitFor({ state: 'hidden' });
    await page.locator('a.back-link').click(); await keep();
    check(await body.inputValue() === '모달과 동시 입력', 'other source lost after modal save');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('a.back-link').click(); await keep();
    check(await body.inputValue() === '모달과 동시 입력', 'mobile cancel lost');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile overflow');
    await page.locator('a.back-link').click(); await discard();
    await page.waitForURL('**/occurrences/rehearsal-1');
    results.push('feedback: new/edit failure/retry, local cancel, combined modal source, 390px discard PASS');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await go('/teams/new'); await name.fill('로그아웃 폐기');
    await page.getByRole('button', { name: '로그아웃', exact: true }).click(); await discard();
    await page.waitForURL('**/login');
    check((await store()).sessionUserId === null && !await dialog.isVisible(), 'logout allow failed');
    results.push('logout allow: session cleared, explicit destination, no false prompt PASS');
    console.log(JSON.stringify(results));
    await page.evaluate((value) => { window.__navigationResults = value; }, results);
  } finally {
    // Restore only the current document: page.goto discards earlier globals.
    await page.evaluate(async () => {
      const { service } = await import('/src/mocks/service.ts');
      if (window.__navigationConfirmOriginal) {
        window.confirm = window.__navigationConfirmOriginal;
        delete window.__navigationConfirmOriginal;
      }
      if (window.__recommendOriginal) {
        service.recommend = window.__recommendOriginal;
        delete window.__recommendOriginal;
      }
      const pending = window.__pending;
      if (pending) {
        service[pending.method] = pending.original;
        pending.release?.();
        delete window.__pending;
      }
    });
  }
}
