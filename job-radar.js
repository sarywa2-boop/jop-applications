(() => {
  const jobsView = document.getElementById('jobs');
  const liveSearch = document.getElementById('amirLiveSearch');
  if (!jobsView || !liveSearch) return;

  const tabs = document.querySelectorAll('.tab[data-view]');
  const views = document.querySelectorAll('.view');
  const jobsTab = document.querySelector('.tab[data-view="jobs"]');
  const searchForm = document.getElementById('amirSearchForm');
  const searchButton = searchForm?.querySelector('button[type="submit"]');
  const status = document.getElementById('amirSearchStatus');
  const liveResults = document.getElementById('amirLiveResults');
  const applicationsView = document.getElementById('applications');
  const applicationsTab = document.querySelector('.tab[data-view="applications"]');
  const applicationsTable = document.getElementById('allApplied');
  const appliedCount = document.getElementById('appliedCount');
  const submittedStorageKey = 'amirSubmittedApplications';

  jobsView.prepend(liveSearch);
  tabs.forEach((tab) => tab.classList.toggle('active', tab === jobsTab));
  views.forEach((view) => view.classList.toggle('active', view === jobsView));
  if (applicationsTab) applicationsTab.textContent = '✓ تم التقديم';
  const applicationsHeading = applicationsView?.querySelector('h2');
  const applicationsDescription = applicationsView?.querySelector('.muted');
  if (applicationsHeading) applicationsHeading.textContent = 'تم التقديم';
  if (applicationsDescription) {
    applicationsDescription.textContent =
      'تقديماتك السابقة والفرص التي تؤكد أنك أرسلت طلبها. لا يُسجّل الإعلان عند فتح رابطه.';
  }

  const heading = liveSearch.querySelector('.head h3');
  const description = liveSearch.querySelector('.head p');
  if (heading) heading.textContent = 'الوظائف المناسبة لك';
  if (description) {
    description.textContent =
      'فرص حقيقية يجمعها أمير ويقيّم مدى ملاءمتها. حدّث البحث، راجع الإعلان، ثم قدّم بنفسك.';
  }
  if (searchButton) searchButton.textContent = 'حدّث الوظائف الآن';

  const readSubmitted = () => {
    try {
      const records = JSON.parse(localStorage.getItem(submittedStorageKey) || '[]');
      return Array.isArray(records) ? records : [];
    } catch (error) {
      console.error('Could not read submitted applications:', error);
      return [];
    }
  };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'غير محدد' : date.toLocaleDateString('ar-SA');
  };
  const renderSubmitted = () => {
    if (!applicationsTable) return;
    applicationsTable.querySelectorAll('[data-user-submission]').forEach((row) => row.remove());
    readSubmitted().forEach((job) => {
      const row = document.createElement('tr');
      row.dataset.userSubmission = 'true';
      row.innerHTML = `<td>${escapeHtml(job.title)}</td>
        <td>${escapeHtml(job.company || job.location || 'غير محدد')}</td>
        <td>${escapeHtml(formatDate(job.appliedAt))}</td>
        <td><span class="status">تم التقديم</span></td>`;
      applicationsTable.append(row);
    });
    if (appliedCount) {
      appliedCount.textContent = String(238 + readSubmitted().length);
    }
  };
  const addSubmissionButtons = () => {
    if (!liveResults) return;
    const submitted = readSubmitted();
    liveResults.querySelectorAll('.source-card').forEach((card, index) => {
      const actions = card.querySelector('.job-actions');
      if (!actions || actions.querySelector('[data-mark-submitted]')) return;
      const link = actions.querySelector('a.apply');
      if (!link) return;
      const url = link.href;
      const alreadySubmitted = submitted.some((job) => job.url === url);
      const button = document.createElement('button');
      button.className = 'apply';
      button.type = 'button';
      button.dataset.markSubmitted = String(index);
      button.textContent = alreadySubmitted ? '✓ تم التقديم' : 'تم التقديم';
      button.disabled = alreadySubmitted;
      actions.append(button);
    });
  };
  liveResults?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('[data-mark-submitted]');
    if (!button) return;
    const index = Number(button.getAttribute('data-mark-submitted'));
    let cached;
    try {
      cached = JSON.parse(localStorage.getItem('amirDailyJobCache') || 'null');
    } catch (error) {
      console.error('Could not read the current job search results:', error);
      if (status) status.textContent = 'تعذّر التحقق من إعلان الوظيفة. حدّث البحث ثم حاول مجددًا.';
      return;
    }
    const job = Array.isArray(cached?.jobs) ? cached.jobs[index] : null;
    if (!job?.url || !window.confirm(`هل أرسلت طلب التقديم فعلًا على «${job.title}»؟`)) return;

    const submitted = readSubmitted();
    if (submitted.some((item) => item.url === job.url)) return;
    submitted.unshift({ ...job, appliedAt: new Date().toISOString() });
    try {
      localStorage.setItem(submittedStorageKey, JSON.stringify(submitted));
    } catch (error) {
      console.error('Could not save submitted application:', error);
      if (status) status.textContent = 'تعذّر حفظ سجل التقديم على هذا الجهاز.';
      return;
    }
    renderSubmitted();
    addSubmissionButtons();
    if (status) status.textContent = `تم تسجيل تقديمك على «${job.title}» في قائمة تم التقديم.`;
  });
  if (liveResults) {
    new MutationObserver(addSubmissionButtons).observe(liveResults, { childList: true, subtree: true });
    addSubmissionButtons();
  }
  renderSubmitted();

  if (
    searchForm &&
    status &&
    !/جارٍ تحديث نتائج الوظائف|جارٍ البحث عن وظائف مناسبة/.test(status.textContent)
  ) {
    searchForm.requestSubmit();
  }
})();
