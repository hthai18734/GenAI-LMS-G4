module.exports = function createController(UseCases) {
const path = require('path');
const ResponseUtil = require('../../utils/common/ResponseUtil');
const { materialService: MaterialService } = UseCases;

class MaterialController {
  async upload(req, res, next) {
    try {
      const material = await MaterialService.uploadMaterial(
        req.params.lessonId,
        req.user,
        req.file,
        req.body
      );
      return ResponseUtil.success(res, {
        status: 201,
        message: 'Material uploaded successfully.',
        data: { material },
      });
    } catch (error) {
      return next(error);
    }
  }

  async list(req, res, next) {
    try {
      const materials = await MaterialService.listMaterials(req.params.lessonId, req.user);
      return ResponseUtil.success(res, { data: { materials } });
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const material = await MaterialService.updateMaterial(
        req.params.materialId,
        req.user,
        req.body
      );
      return ResponseUtil.success(res, {
        message: 'Material updated successfully.',
        data: { material },
      });
    } catch (error) {
      return next(error);
    }
  }

  async remove(req, res, next) {
    try {
      await MaterialService.deleteMaterial(req.params.materialId, req.user);
      return ResponseUtil.success(res, { message: 'Material deleted successfully.' });
    } catch (error) {
      return next(error);
    }
  }

  async download(req, res, next) {
    try {
      const info = await MaterialService.getDownloadInfo(req.params.materialId, req.user);
      res.setHeader('Content-Type', info.mimeType);
      if (req.query.view === 'true') {
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(info.fileName)}"`);
        return res.sendFile(path.resolve(info.filePath));
      }
      return res.download(path.resolve(info.filePath), info.fileName);
    } catch (error) {
      return next(error);
    }
  }
}

return  new MaterialController();
};
