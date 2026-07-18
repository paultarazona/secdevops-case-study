'use strict';

window.LabShell = function createLabShell({ mode, counterpartUrl, onLessonAction }) {
  const challenges = window.LAB_CHALLENGES || [];
  const catalog = document.querySelector('#challenge-list');
  const lesson = document.querySelector('#lesson-panel');
  const progressKey = `secdevops-lab-progress-${mode}`;
  let selectedId = window.location.hash.replace('#challenge/', '') || 'sql-injection';
  let progress = loadProgress();

  function loadProgress() {
    try {
      return JSON.parse(window.localStorage.getItem(progressKey)) || {};
    } catch {
      return {};
    }
  }

  function saveProgress() {
    window.localStorage.setItem(progressKey, JSON.stringify(progress));
  }

  function selected() {
    return challenges.find((challenge) => challenge.id === selectedId) || challenges[0];
  }

  function renderCatalog() {
    const completed = Object.keys(progress).length;
    document.querySelector('#progress-summary').textContent = window.t
      ? window.t('progress_summary', { count: completed })
      : `${completed} verified`;
    catalog.replaceChildren();

    for (const challenge of challenges) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `challenge-link${challenge.id === selectedId ? ' is-current' : ''}`;
      button.dataset.challenge = challenge.id;
      const badgeText = progress[challenge.id]
        ? (window.t ? window.t('state_verified_badge') : 'Verified')
        : challenge.available
          ? (window.t ? window.t('state_available_badge') : 'Available')
          : (window.t ? window.t('state_planned_badge') : 'Planned');

      const titleText = window.t ? window.t(`challenge_${challenge.id}_title`) : challenge.title;
      const levelText = window.t ? window.t(`level_${challenge.level.toLowerCase()}`) : challenge.level;

      button.innerHTML = `<span>${badgeText}</span><strong>${titleText}</strong><small>${levelText}</small>`;
      item.append(button);
      catalog.append(item);
    }
  }

  function renderLesson() {
    const challenge = selected();
    const isV1 = mode === 'v1';
    const versionName = isV1
      ? (window.t ? window.t('v1_vulnerable_env') : 'V1 vulnerable environment')
      : (window.t ? window.t('v2_hardened_env') : 'V2 hardened environment');

    const versionCopy = isV1
      ? (window.t ? window.t(`challenge_${challenge.id}_v1`) : challenge.v1)
      : (window.t ? window.t(`challenge_${challenge.id}_v2`) : challenge.v2);

    const state = progress[challenge.id]
      ? (window.t ? window.t('state_verified_device') : 'Verified on this device')
      : challenge.available
        ? (window.t ? window.t('state_ready_practice') : 'Ready to practice')
        : (window.t ? window.t('state_prep_progress') : 'Lesson preparation in progress');

    const objectiveText = window.t ? window.t(`challenge_${challenge.id}_objective`) : challenge.objective;
    const whatToObserveText = window.t ? window.t('what_to_observe') : 'What to observe';
    const evidenceTextHeader = window.t ? window.t('evidence_header') : 'Evidence';
    const evidenceText = window.t ? window.t(`challenge_${challenge.id}_evidence`) : challenge.evidence;
    const actionLabelText = window.t ? window.t(`challenge_${challenge.id}_action_label`) : (challenge.actionLabel || (window.t ? window.t('load_guided_input') : 'Load guided local input'));
    const comparisonText = window.t
      ? window.t(isV1 ? 'open_v2_comparison' : 'open_v1_comparison')
      : `Open ${isV1 ? 'V2 comparison' : 'V1 comparison'}`;
    const resetText = window.t ? window.t('reset_local_verification') : 'Reset local verification';
    const nextInRouteText = window.t ? window.t('next_in_route') : 'Next in the route';
    const plannedChallengeDesc = window.t ? window.t('planned_challenge_desc') : 'This challenge is visible in the catalog so the learning route is clear. Its controlled exercise and verification will be added as the next vertical slice.';
    const levelText = window.t ? window.t(`level_${challenge.level.toLowerCase()}`) : challenge.level;

    lesson.innerHTML = `
      <div class="lesson-meta"><span>${levelText}</span><span>${challenge.cwe}</span><span>${challenge.owasp}</span></div>
      <div class="lesson-heading">
        <div><p class="section-label">${versionName}</p><h2>${window.t ? window.t(`challenge_${challenge.id}_title`) : challenge.title}</h2></div>
        <span class="state state-${progress[challenge.id] ? 'verified' : challenge.available ? 'ready' : 'planned'}">${state}</span>
      </div>
      <p class="lesson-objective">${objectiveText}</p>
      ${challenge.available ? `
        <div class="lesson-grid">
          <section><h3>${whatToObserveText}</h3><p>${versionCopy}</p></section>
          <section><h3>${evidenceTextHeader}</h3><p>${evidenceText}</p></section>
        </div>
        <div class="lesson-actions">
          <button type="button" data-lab-action="${challenge.action || 'guided-input'}">${actionLabelText}</button>
          <a class="button-link" href="${counterpartUrl}#challenge/${challenge.id}">${comparisonText}</a>
          <button type="button" class="secondary" data-lab-action="reset-progress">${resetText}</button>
        </div>
      ` : `
        <section class="planned-lesson"><h3>${nextInRouteText}</h3><p>${plannedChallengeDesc}</p></section>
      `}
    `;
  }

  function selectChallenge(id) {
    selectedId = id;
    window.location.hash = `challenge/${id}`;
    renderCatalog();
    renderLesson();
    lesson.focus();
  }

  catalog.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-challenge]');
    if (button) selectChallenge(button.dataset.challenge);
  });

  lesson.addEventListener('click', (event) => {
    const action = event.target.closest('[data-lab-action]')?.dataset.labAction;
    if (action && action !== 'reset-progress') onLessonAction(action, selected());
    if (action === 'reset-progress') {
      delete progress[selectedId];
      saveProgress();
      renderCatalog();
      renderLesson();
    }
  });

  window.addEventListener('hashchange', () => {
    selectedId = window.location.hash.replace('#challenge/', '') || 'sql-injection';
    renderCatalog();
    renderLesson();
  });

  renderCatalog();
  renderLesson();

  return {
    selectedId: () => selectedId,
    markVerified(id) {
      progress[id] = true;
      saveProgress();
      renderCatalog();
      renderLesson();
    },
    render() {
      renderCatalog();
      renderLesson();
    }
  };
};
