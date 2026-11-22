// Playwright CLI run-code. Isolated Chromium session and Vite dev server only.
async (page) => {
  const results = [];
  const check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  const base = new URL(page.url()).origin;
  const unload = () =>
    page.evaluate(() => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });
  const unsaved = page.getByRole("dialog", {
    name: "저장하지 않은 내용을 버릴까요?",
  });
  const keep = async () => {
    await unsaved.getByRole("button", { name: "계속 작성" }).click();
    await unsaved.waitFor({ state: "hidden" });
  };
  const fail = () =>
    page.evaluate(async () =>
      (await import("/src/stores/app-store.ts")).useAppStore.setState({
        failNext: true,
      }),
    );
  const pending = (method) =>
    page.evaluate(async (method) => {
      const { service } = await import("/src/mocks/service.ts");
      const original = service[method];
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      window.__interfacePending = { method, original, release, calls: 0 };
      service[method] = async (...args) => {
        window.__interfacePending.calls++;
        await gate;
        return original(...args);
      };
    }, method);
  const release = () =>
    page.evaluate(async () => {
      const { service } = await import("/src/mocks/service.ts");
      const state = window.__interfacePending;
      service[state.method] = state.original;
      state.release();
    });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(async () => {
      const { service } = await import("/src/mocks/service.ts");
      await service.reset();
      await service.login("jiwoo");
    });
    await page.goto(base + "/teams");
    await page.getByRole("link", { name: "내 일정", exact: true }).click();
    await page.getByRole("heading", { name: "2026년 10월" }).waitFor();
    await page.getByRole("button", { name: "일정 추가", exact: true }).click();
    const event = page.getByRole("dialog", { name: "바쁜 시간 추가" });
    const title = event.locator('input[name="title"]');
    await title.fill("회귀 개인 일정");
    check(await unload(), "event dirty beforeunload");
    await page.goBack();
    await keep();
    check(
      page.url().endsWith("/calendar") &&
        (await title.inputValue()) === "회귀 개인 일정",
      "event back cancel preserves input",
    );
    check(
      await title.evaluate((el) =>
        el.closest('[role="dialog"]').contains(document.activeElement),
      ),
      "focus returns inside original form",
    );
    await fail();
    await event.getByRole("button", { name: "저장", exact: true }).click();
    await event.getByRole("alert").waitFor();
    check(
      (await title.inputValue()) === "회귀 개인 일정" && (await unload()),
      "event save failure retains input and protection",
    );
    await pending("saveEvent");
    await event.getByRole("button", { name: "저장", exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector('input[name="title"]').disabled,
    );
    check(
      await event
        .getByRole("button", { name: "닫기", exact: true })
        .first()
        .isDisabled(),
      "event close locked",
    );
    await page.keyboard.press("Escape");
    check(await event.isVisible(), "event Escape locked");
    await page.goBack();
    const saving = page.getByRole("dialog", { name: "저장 중입니다" });
    await saving.getByRole("button", { name: "계속 작성" }).click();
    await release();
    await event.waitFor({ state: "hidden" });
    check(!(await unload()), "event success clean");
    results.push(
      "event: back/focus, failure preservation, pending inputs/close/Escape/back, success clean PASS",
    );

    const from = page.getByLabel("시작일", { exact: true });
    const originalFrom = await from.inputValue();
    await from.fill("2026-10-13");
    await page.getByRole("link", { name: "내 팀 목록", exact: true }).click();
    await keep();
    check(
      (await from.inputValue()) === "2026-10-13" && (await unload()),
      "range back cancel",
    );
    await fail();
    await page.getByRole("button", { name: "입력 완료 표시" }).click();
    await page.getByRole("alert").waitFor();
    check(await unload(), "range failed save stays dirty");
    await page.getByRole("button", { name: "일정 추가", exact: true }).click();
    await title.fill("별도 폼 저장");
    await event.getByRole("button", { name: "저장", exact: true }).click();
    await event.waitFor({ state: "hidden" });
    check(await unload(), "event save must not clear range");
    await pending("confirmCalendar");
    await page.getByRole("button", { name: "입력 완료 표시" }).click();
    await page.waitForFunction(
      () => document.querySelector('input[type="date"]').disabled,
    );
    await release();
    await page.getByRole("button", { name: "입력 완료 표시" }).waitFor();
    check(!(await unload()), "range success clean");
    await from.fill(originalFrom);
    check(await unload(), "range new baseline");
    await from.fill("2026-10-13");
    check(!(await unload()), "range revert clean");
    results.push(
      "range: navigation/failure, independent dirty sources, pending lock, success/revert baseline PASS",
    );

    await page
      .getByRole("button", { name: /샘플 캘린더 연결|다시 동기화/ })
      .click();
    await page.getByRole("button", { name: "선택한 캘린더 가져오기" }).click();
    await page
      .getByRole("dialog", { name: "샘플 캘린더 동기화" })
      .waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "목록 보기" }).click();
    await page
      .getByRole("button")
      .filter({ hasText: "Google · 읽기 전용" })
      .first()
      .click();
    const google = page.getByRole("dialog", { name: "Google 일정" });
    check(
      (await google.locator('input[name="title"]').isDisabled()) &&
        !(await unload()),
      "google readonly is clean",
    );
    await page.keyboard.press("Escape");
    await google.waitFor({ state: "hidden" });
    results.push("Google readonly: disabled and clean PASS");

    await page.getByLabel("팀 전환").selectOption("padong");
    await page.getByRole("link", { name: "팀 멤버", exact: true }).click();
    await page.getByRole("heading", { name: /함께하는 멤버/ }).waitFor();
    await page.getByRole("button", { name: "멤버 초대", exact: true }).click();
    const invite = page.getByRole("dialog", { name: "함께할 멤버 초대" });
    const email = invite.locator('input[name="email"]');
    await email.fill("interface@example.com");
    check(await unload(), "invite dirty beforeunload");
    await page.goBack();
    await keep();
    check(
      (await email.inputValue()) === "interface@example.com",
      "invite back cancel",
    );
    await fail();
    await invite.getByRole("button", { name: "데모 초대 생성" }).click();
    await invite.getByRole("alert").waitFor();
    check(
      (await email.inputValue()) === "interface@example.com" &&
        (await unload()),
      "invite failure retained",
    );
    await pending("invite");
    await invite.getByRole("button", { name: "데모 초대 생성" }).click();
    await page.waitForFunction(
      () => document.querySelector('input[name="email"]').disabled,
    );
    check(
      await invite
        .getByRole("button", { name: "닫기", exact: true })
        .isDisabled(),
      "invite close locked",
    );
    await page.keyboard.press("Escape");
    check(await invite.isVisible(), "invite escape locked");
    await release();
    await invite.waitFor({ state: "hidden" });
    check(!(await unload()), "invite success clean");
    await page.getByRole("button", { name: "멤버 초대", exact: true }).click();
    await email.fill("discard@example.com");
    await page.evaluate(() => {
      window.__interfaceConfirm = window.confirm;
      window.confirm = () => true;
    });
    await invite.getByRole("button", { name: "닫기", exact: true }).click();
    await invite.waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "멤버 초대", exact: true }).click();
    check(
      (await email.inputValue()) === "" && !(await unload()),
      "invite discard resets draft",
    );
    await page.keyboard.press("Escape");
    results.push(
      "invite: back, failure, pending input/close/Escape, success clean, discard resets PASS",
    );

    await page.setViewportSize({ width: 390, height: 844 });
    const opener = page.getByRole("button", { name: "메뉴 열기", includeHidden: true });
    await opener.click();
    const menu = page.getByRole("dialog", {
      name: "작업 공간 메뉴",
      exact: true,
    });
    check(
      (await opener.getAttribute("aria-expanded")) === "true",
      "menu expanded",
    );
    check(
      (await menu.getAttribute("id")) ===
        (await opener.getAttribute("aria-controls")),
      "menu control target",
    );
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      check(
        await menu.evaluate((el) => el.contains(document.activeElement)),
        "menu focus trap",
      );
    }
    await page.keyboard.press("Escape");
    await menu.waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "메뉴 열기");
    check(
      await opener.evaluate((el) => document.activeElement === el),
      "menu focus restore",
    );
    await opener.click();
    await menu.getByRole("link", { name: "내 일정", exact: true }).click();
    await page.waitForURL("**/calendar");
    await from.fill("2026-10-12");
    await opener.click();
    await menu.getByRole("link", { name: "내 팀 목록", exact: true }).click();
    await keep();
    check(
      (await from.inputValue()) === "2026-10-12",
      "mobile navigation cancel retained",
    );
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "390px overflow",
    );
    await from.fill("2026-10-13");
    await page.getByRole("link", { name: "본문으로 건너뛰기" }).focus();
    await page.keyboard.press("Enter");
    check(
      await page
        .locator("main")
        .evaluate((el) => document.activeElement === el),
      "skip link focus",
    );
    results.push(
      "390px menu: aria, trap, Escape, focus restore, link navigation guard, skip main, overflow PASS",
    );
    await page.evaluate((value) => {
      window.__interfaceResults = value;
    }, results);
  } finally {
    await page.evaluate(async () => {
      if (window.__interfaceConfirm) {
        window.confirm = window.__interfaceConfirm;
        delete window.__interfaceConfirm;
      }
      if (window.__interfacePending) {
        const { service } = await import("/src/mocks/service.ts");
        const state = window.__interfacePending;
        service[state.method] = state.original;
        state.release();
        delete window.__interfacePending;
      }
    });
  }
}
