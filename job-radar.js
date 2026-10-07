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

  jobsView.prepend(liveSearch);
  tabs.forEach((tab) => tab.classList.toggle('active', tab === jobsTab));
  views.forEach((view) => view.classList.toggle('active', view === jobsView));

  const heading = liveSearch.querySelector('.head h3');
  const description = liveSearch.querySelector('.head p');
  if (heading) heading.textContent = 'الوظائف المناسبة لك';
  if (description) {
    description.textContent =
      'فرص حقيقية يجمعها أمير ويقيّم مدى ملاءمتها. حدّث البحث، راجع الإعلان، ثم قدّم بنفسك.';
  }
  if (searchButton) searchButton.textContent = 'حدّث الوظائف الآن';

  if (
    searchForm &&
    status &&
    !/جارٍ تحديث نتائج الوظائف|جارٍ البحث عن وظائف مناسبة/.test(status.textContent)
  ) {
    searchForm.requestSubmit();
  }
})();
