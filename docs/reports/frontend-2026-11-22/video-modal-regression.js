// Playwright CLI run-code input. Run against Vite dev, signed in as 지우 with seed data.
// Browser-only instrumentation holds the existing mock request; production code is untouched.
async (page) => {
  const base = new URL(page.url()).origin;
  const occurrence = `${base}/teams/padong/occurrences/rehearsal-1`;
  const check = (value, message) => { if (!value) throw new Error(message); };
  const results = [];
  const runId = Date.now();
  const confirmationCount = () => page.evaluate(() => window.__confirmProbe.count);
  const chooseDiscard = (accept) => page.evaluate((value) => { window.__confirmProbe.accept = value; }, accept);
  const modal = page.getByRole('dialog');
  const closeBy = async (path) => {
    if (path === 'Escape') await page.keyboard.press('Escape');
    else if (path === 'overlay') await page.locator('.modal-overlay').click({ position: { x: 4, y: 4 } });
    else await modal.getByRole('button', { name: path, exact: true }).click();
  };
  const focusRestored = async (name) => {
    await page.waitForFunction((text) => document.activeElement?.textContent?.trim() === text, name);
  };
  try {
    for (const mode of ['add', 'edit']) {
      await page.goto(mode === 'add' ? occurrence : `${occurrence}/videos/video-1`);
      await page.evaluate(() => {
        window.__confirmProbe = { count: 0, accept: false, original: window.confirm };
        window.confirm = () => { window.__confirmProbe.count++; return window.__confirmProbe.accept; };
      });
      const openerName = mode === 'add' ? '영상 추가' : '수정';
      const opener = page.getByRole('button', { name: openerName, exact: true });
      await opener.waitFor();
      for (const path of ['취소', 'Escape', '닫기', 'overlay']) {
        console.log(`checking ${mode}/${path}`);
        await opener.click();
        const title = modal.getByRole('textbox', { name: '영상 제목', exact: true });
        const original = await title.inputValue();
        const before = await confirmationCount();
        await closeBy(path);
        await modal.waitFor({ state: 'hidden' });
        check(await confirmationCount() === before, `${mode}/${path}: clean prompted`);
        await focusRestored(openerName);
        await opener.click();
        await title.fill(`${original} 임시 변경`);
        await chooseDiscard(false);
        await closeBy(path);
        check(await modal.isVisible(), `${mode}/${path}: dismissed dirty form`);
        check(await title.inputValue() === `${original} 임시 변경`, 'dirty input lost');
        check(await confirmationCount() === before + 1, 'missing dirty confirmation');
        await chooseDiscard(true);
        await closeBy(path);
        await modal.waitFor({ state: 'hidden' });
        await focusRestored(openerName);
        check(await confirmationCount() === before + 2, 'missing discard confirmation');
        // Returning exactly to default values must be clean again.
        await opener.click();
        await title.fill(`${original} changed`);
        await title.fill(original);
        await closeBy(path);
        await modal.waitFor({ state: 'hidden' });
        check(await confirmationCount() === before + 2, 'reverted input still dirty');
        results.push(`${mode}/${path}: clean, dirty cancel/accept, revert, focus PASS`);
      }
      await opener.click();
      const title = modal.getByRole('textbox', { name: '영상 제목', exact: true });
      await title.fill('');
      await modal.getByRole('button', { name: mode === 'add' ? '영상 추가' : '변경 저장', exact: true }).click();
      await page.waitForFunction(() => document.activeElement?.id === 'video-title');
      check(await title.isEnabled(), 'invalid submission left inputs locked');
      results.push(`${mode}: invalid submit first-error focus/unlock PASS`);
      if (mode === 'add') await modal.getByRole('button', { name: '로컬 데모 영상 선택' }).click();
      await title.fill(`회귀 검증 ${mode} ${runId}`);
      await page.evaluate(async (method) => {
        const { service } = await import('/src/mocks/service.ts');
        const original = service[method];
        window.__videoProbe = { calls: 0, original, method };
        service[method] = async (...args) => {
          window.__videoProbe.calls++;
          await new Promise((resolve) => { window.__videoProbe.release = resolve; });
          return original(...args);
        };
        const { useAppStore } = await import('/src/stores/app-store.ts');
        useAppStore.setState({ failNext: true });
      }, mode === 'add' ? 'addVideo' : 'updateVideo');
      const beforeSave = await confirmationCount();
      // Two same-tick submit events exercise the synchronous guard before validation resolves.
      await modal.locator('form').evaluate((form) => {
        form.requestSubmit();
        form.requestSubmit();
      });
      await page.waitForFunction(() => window.__videoProbe.calls === 1);
      check(await title.isDisabled(), 'title not locked');
      check(await modal.getByRole('textbox', { name: '영상 주소', exact: true }).isDisabled(), 'URL not locked');
      check(await modal.getByRole('button', { name: '로컬 데모 영상 선택' }).isDisabled(), 'demo not locked');
      check(await modal.getByRole('button', { name: '취소', exact: true }).isDisabled(), 'cancel not locked');
      check(await modal.getByRole('button', { name: '저장 중…', exact: true }).isDisabled(), 'submit not locked');
      for (const path of ['Escape', '닫기', 'overlay']) {
        await closeBy(path);
        check(await modal.isVisible(), `pending ${path} dismissed`);
      }
      check(await confirmationCount() === beforeSave, 'pending dismiss prompted');
      await page.evaluate(() => window.__videoProbe.release());
      await modal.getByText('데모 요청이 실패했습니다. 입력을 유지했으니 다시 시도해 주세요.').waitFor();
      check(await title.inputValue() === `회귀 검증 ${mode} ${runId}`, 'failure input lost');
      check(await title.isEnabled(), 'failure remained locked');
      await chooseDiscard(false);
      await closeBy('Escape');
      check(await modal.isVisible(), 'failure dismissal lost form');
      check(await modal.getByText('데모 요청이 실패했습니다. 입력을 유지했으니 다시 시도해 주세요.').isVisible(), 'failure error lost');
      await page.evaluate(async () => {
        const { service } = await import('/src/mocks/service.ts');
        service[window.__videoProbe.method] = window.__videoProbe.original;
        delete window.__videoProbe;
      });
      const beforeRetry = await confirmationCount();
      await modal.getByRole('button', { name: mode === 'add' ? '영상 추가' : '변경 저장', exact: true }).click();
      await modal.waitFor({ state: 'hidden' });
      await focusRestored(openerName);
      check(await confirmationCount() === beforeRetry, 'successful save prompted');
      check(await page.getByRole('heading', { name: `회귀 검증 ${mode} ${runId}`, exact: true }).count() === 1, 'save missing/duplicated');
      results.push(`${mode}: pending guards, duplicate submit, failure preservation, retry, success focus PASS`);
    }
    await page.evaluate((value) => { window.__videoRegressionResults = value; }, results);
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await page.evaluate(async () => {
      if (window.__confirmProbe) {
        window.confirm = window.__confirmProbe.original;
        delete window.__confirmProbe;
      }
      if (!window.__videoProbe) return;
      const { service } = await import('/src/mocks/service.ts');
      service[window.__videoProbe.method] = window.__videoProbe.original;
      window.__videoProbe.release?.();
      delete window.__videoProbe;
    });
  }
}
