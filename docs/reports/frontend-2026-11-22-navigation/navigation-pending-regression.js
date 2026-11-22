// Additional Vite browser regression: pending requests, real persisted baseline, reset.
async (page) => {
  try {
    const base = new URL(page.url()).origin;
    const check = (value, message) => { if (!value) throw new Error(message); };
    const results = [];
    await page.evaluate(async () => { const { service } = await import('/src/mocks/service.ts'); await service.login('jiwoo'); });
    const hold = async (method) => page.evaluate(async (method) => {
      const { service } = await import('/src/mocks/service.ts');
      const original = service[method];
      window.__pending = { original, method };
      service[method] = async (...args) => { await new Promise(resolve => { window.__pending.release = resolve; }); return original(...args); };
    }, method);
    const release = async () => page.evaluate(async () => {
      const { service } = await import('/src/mocks/service.ts');
      const p = window.__pending; service[p.method] = p.original; p.release();
    });
    await page.goto(base + '/teams');
    await page.getByRole('button', { name: '팀 만들기', exact: true }).click();
    await page.getByPlaceholder('예: 파동 극단').fill('보류 저장');
    await hold('createTeam');
    await page.getByRole('button', { name: '팀 만들기', exact: true }).click();
    await page.waitForFunction(() => !!window.__pending.release);
    check(await page.getByPlaceholder('예: 파동 극단').isDisabled(), 'pending team not locked');
    await page.goBack();
    await page.getByRole('dialog', { name: '저장 중입니다' }).waitFor();
    check(page.url().endsWith('/teams/new'), 'pending back escaped');
    await release();
    await page.waitForURL(/\/teams\/(?!new)[^/]+$/);
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    results.push('pending team: locked input, browser back blocked, success target/no stale dialog PASS');
    await page.goto(base + '/teams/padong/scheduling');
    await page.getByRole('button', { name: '발표 예시 채우기' }).click();
    await page.evaluate(async () => {
      const { service } = await import('/src/mocks/service.ts');
      window.__recommendOriginal = service.recommend;
      service.recommend = async () => { throw new Error('검증용 추천 실패'); };
    });
    await page.getByRole('button', { name: '추천 시간 찾기' }).click();
    await page.getByRole('alert').waitFor();
    await page.getByRole('link', { name: '내 일정', exact: true }).click();
    await page.waitForURL('**/calendar');
    check(!await page.getByRole('dialog').isVisible(), 'persisted draft false dirty after recommend error');
    await page.evaluate(async () => { (await import('/src/mocks/service.ts')).service.recommend = window.__recommendOriginal; });
    results.push('saveDraft success/recommend failure: stored baseline clean PASS');
    await page.goto(base + '/teams/new');
    await page.getByPlaceholder('예: 파동 극단').fill('초기화 폐기');
    await page.locator('.demo-tools summary').click();
    await page.evaluate(() => { window.__navigationConfirmOriginal = window.confirm; window.confirm = () => true; });
    await page.getByRole('button', { name: '데모 초기화', exact: true }).click();
    await page.getByRole('button', { name: '버리고 이동', exact: true }).click();
    await page.waitForURL('**/login');
    check(!await page.getByRole('dialog').isVisible(), 'reset success false prompt');
    results.push('reset discard: original login destination/no false prompt PASS');
    await page.evaluate(value => { window.__navigationPendingResults = value; }, results);
    console.log(JSON.stringify(results));
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
