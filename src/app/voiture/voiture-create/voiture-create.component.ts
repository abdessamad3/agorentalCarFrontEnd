import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { VoitureService } from '../../services/voiture.service';

@Component({
  selector: 'app-voiture-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './voiture-create.component.html',
  styleUrls: ['./voiture-create.component.css']
})
export class VoitureCreateComponent {
  carForm: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  isUploading = false;

  constructor(
    private fb: FormBuilder,
    private voitureService: VoitureService,
    private router: Router
  ) {
    this.carForm = this.fb.group({
      marque: ['', Validators.required],      // Brand
      modele: ['', Validators.required],      // Model
      annee: [new Date().getFullYear(), Validators.required],
      kilometrage: [0, [Validators.min(0)]], // Mapped to kilometrageActuel
      typeCarburant: ['Essence'],            // Fuel Type
      couleur: [''],                         // Color
      climatisation: [false],                // AC Checkbox
      prix: [0, [Validators.required, Validators.min(0)]], // Mapped to prixJour
      prixJ: [0],                           // Purchase Price (Optional)
      bureauId: ['']                         // Optional
    });
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;

      // Preview logic
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

   onSubmit(): void {
    if (this.carForm.invalid || !this.selectedFile) {
      alert('Please fill all required fields and select an image.');
      return;
    }

    this.isUploading = true;

    // Create FormData
    const formData = new FormData();

    // Map Form Fields to Backend Names
    formData.append('marque', this.carForm.value.marque);
    formData.append('modele', this.carForm.value.modele);
    formData.append('annee', this.carForm.value.annee);
    formData.append('kilometrageActuel', this.carForm.value.kilometrage); // Mapping
    formData.append('typeCarburant', this.carForm.value.typeCarburant);
    formData.append('couleur', this.carForm.value.couleur);
    formData.append('climatisation', this.carForm.value.climatisation);
    formData.append('prixJour', this.carForm.value.prix); // Mapping
    formData.append('prixAchat', this.carForm.value.prixJ);

    if (this.carForm.value.bureauId) {
      formData.append('bureauId', this.carForm.value.bureauId);
    }

    // Append the File
    formData.append('imageFile', this.selectedFile);

    this.voitureService.createVoiture(formData).subscribe({
      next: () => {
        this.isUploading = false;
        alert('Car added successfully'); // "Car added successfully"
        this.router.navigate(['/voiture-list']);
      },
      error: (err) => {
        this.isUploading = false;
        console.error(err);
        alert('problem in adding');
      }
    });
  }
}
