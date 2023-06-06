import axios from "axios";

export default class RegistrationForm {
  constructor() {
    this._csrf = document.querySelector('[name="_csrf"]').value;
    this.form = document.querySelector("#registration-form");
    this.allFields = document.querySelectorAll(
      "#registration-form .form-control"
    );
    this.insertValidationElements();
    this.username = document.querySelector("#username-register");
    this.username.previousValue = "";
    this.email = document.querySelector("#email-register");
    this.email.previousValue = "";
    this.password = document.querySelector("#password-register");
    this.password.previousValue = "";
    this.username.isUnique = false;
    this.email.isUnique = false;
    this.event();
  }
  //event
  event() {
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.formSubmitHandle();
    });
    this.username.addEventListener("keyup", () => {
      this.isDifferent(this.username, this.usernameHandler);
    });
    this.email.addEventListener("keyup", () => {
      this.isDifferent(this.email, this.emailHandler);
    });
    this.password.addEventListener("keyup", () => {
      this.isDifferent(this.password, this.passwordHandler);
    });
    this.username.addEventListener("blur", () => {
      this.isDifferent(this.username, this.usernameHandler);
    });
    this.email.addEventListener("blur", () => {
      this.isDifferent(this.email, this.emailHandler);
    });
    this.password.addEventListener("blur", () => {
      this.isDifferent(this.password, this.passwordHandler);
    });
  }
  //method
  isDifferent(el, handler) {
    if (el.previousValue != el.value) {
      handler.call(this);
    }
    el.previousValue = el.value;
  }
  formSubmitHandle() {
    this.usernameImmediately();
    this.usernameAfterDelay();
    this.emailAfterDelay();
    this.passwordImmediately();
    this.passwordAfterDelay();
    if (!this.username.errors && !this.email.errors && !this.password.errors) {
      this.form.submit();
    }
  }
  usernameHandler() {
    this.username.errors = false;
    this.usernameImmediately();
    clearTimeout(this.username.timer);
    this.username.timer = setTimeout(() => this.usernameAfterDelay(), 800);
  }
  emailHandler() {
    this.email.errors = false;
    this.hideValidationError(this.email);
    clearTimeout(this.email.timer);
    this.email.timer = setTimeout(() => this.emailAfterDelay(), 800);
  }
  passwordHandler() {
    this.password.errors = false;
    this.passwordImmediately();
    clearTimeout(this.password.timer);
    this.password.timer = setTimeout(() => this.passwordAfterDelay(), 800);
  }
  passwordImmediately() {
    if (this.password.value.length > 50) {
      this.showValidationError(
        this.password,
        "password cannot exceed 50 letters"
      );
    }
    if (!this.password.errors) {
      this.hideValidationError(this.password);
    }
  }
  usernameImmediately() {
    if (
      this.username.value != "" &&
      !/^([a-zA-Z0-9]+)$/.test(this.username.value)
    ) {
      this.showValidationError(
        this.username,
        "Username can only contain number and letters"
      );
    }
    if (this.username.value.length > 30) {
      this.showValidationError(
        this.username,
        "Username can not exceed 30 characters"
      );
    }
    if (!this.username.errors) {
      this.hideValidationError(this.username);
    }
  }
  showValidationError(el, message) {
    el.nextElementSibling.innerHTML = message;
    el.nextElementSibling.classList.add("liveValidateMessage--visible");
    el.errors = true;
  }
  hideValidationError(el) {
    el.nextElementSibling.classList.remove("liveValidateMessage--visible");
  }
  usernameAfterDelay() {
    if (this.username.value.length < 3) {
      this.showValidationError(
        this.username,
        "Username must be at least 3 characters"
      );
    }
    if (!this.username.errors) {
      axios
        .post("/doesUsernameExist", {
          _csrf: this._csrf,
          username: this.username.value,
        })
        .then((response) => {
          if (response.data) {
            this.showValidationError(
              this.username,
              "This username is already exists"
            );
            this.username.isUnique = false;
          } else {
            this.username.isUnique = true;
          }
        })
        .catch(() => {
          console.log("please try again later");
        });
    }
  }
  passwordAfterDelay() {
    if (this.password.value.length < 6) {
      this.showValidationError(
        this.password,
        "Password must be at lease 6 characters"
      );
    }
  }
  emailAfterDelay() {
    if (!/^\S+@\S+$/.test(this.email.value)) {
      this.showValidationError(
        this.email,
        "You must provide a valid email address"
      );
    }
    if (!this.email.errors) {
      axios
        .post("/doesEmailExist", { _csrf: this._csrf, email: this.email.value })
        .then((response) => {
          if (response.data) {
            this.email.isUnique = false;
            this.showValidationError(
              this.email,
              "This email address is already exists"
            );
          } else {
            this.email.isUnique = true;
            this.hideValidationError(this.email);
          }
        })
        .catch(() => {
          console.log("try again later");
        });
    }
  }
  insertValidationElements() {
    this.allFields.forEach((field) => {
      field.insertAdjacentHTML(
        "afterend",
        '<div class="alert alert-danger small liveValidateMessage"></div>'
      );
    });
  }
}
