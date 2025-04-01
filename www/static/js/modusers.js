document.querySelectorAll('form input[type="submit"]').forEach(i => i.addEventListener("click", e => {
    e.preventDefault();

    e.target
        .parentElement
        .parentElement
        .querySelector('input[name="status"]').value = e.target.value.toLowerCase();

    e.target.parentElement.parentElement.submit();
}));
